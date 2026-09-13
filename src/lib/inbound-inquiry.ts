import { createServiceClient } from "@/lib/supabase/server";
import { runInquiryAgent } from "@/lib/ai-agent";
import { sendWhatsAppMessage } from "@/lib/notify/whatsapp";
import { sendEmail } from "@/lib/notify/email";

export interface InboundInquiry {
  channel: "whatsapp" | "email";
  contactAddress: string; // phone number (whatsapp) or email address
  guestName: string | null;
  message: string;
}

/**
 * Shared pipeline for every inbound B2C channel: resolve the organization,
 * match/create the guest and lead, log the inbound message, run the Pixel AI
 * agent (which may itself create/send a quotation or flag a booking request —
 * see src/lib/ai-agent.ts for how those are safely gated), and either
 * auto-reply (Level 3 — pure informational, high confidence, org opted in),
 * leave a draft for staff to review (Level 2), or escalate to a human.
 */
export async function handleInboundInquiry(inquiry: InboundInquiry) {
  const supabase = createServiceClient();
  const orgSlug = process.env.PIXEL_DEFAULT_ORGANIZATION_SLUG;
  if (!orgSlug) {
    throw new Error("PIXEL_DEFAULT_ORGANIZATION_SLUG is not configured.");
  }

  const { data: org } = await supabase.from("organizations").select("id, ai_auto_reply_enabled").eq("slug", orgSlug).maybeSingle();
  if (!org) throw new Error(`Unknown organization slug ${orgSlug}`);

  const contactColumn = inquiry.channel === "whatsapp" ? "whatsapp" : "email";
  const { data: guest } = await supabase
    .from("guests")
    .select("id, first_name, last_name")
    .eq("organization_id", org.id)
    .or(`${contactColumn}.eq.${inquiry.contactAddress},phone.eq.${inquiry.contactAddress}`)
    .maybeSingle();

  const guestName = guest ? `${guest.first_name} ${guest.last_name}`.trim() : inquiry.guestName;

  const leadContactField = inquiry.channel === "whatsapp" ? "contact_phone" : "contact_email";
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("organization_id", org.id)
    .eq(leadContactField, inquiry.contactAddress)
    .not("status", "in", "(won,lost)")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let leadId = existingLead?.id ?? null;
  if (!leadId) {
    const { data: newLead, error } = await supabase
      .from("leads")
      .insert({
        organization_id: org.id,
        guest_name: guestName ?? "Unknown guest",
        source: inquiry.channel,
        contact_phone: inquiry.channel === "whatsapp" ? inquiry.contactAddress : null,
        contact_email: inquiry.channel === "email" ? inquiry.contactAddress : null,
        status: "new",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    leadId = newLead.id;

    await supabase.from("events").insert({
      event_type: "INQUIRY_CREATED",
      source_app: "pixel_core",
      entity_type: "lead",
      entity_id: leadId,
      payload: { channel: inquiry.channel, contact: inquiry.contactAddress },
      status: "completed",
      processed_at: new Date().toISOString(),
    });
  }

  // Prior messages on this thread give the agent conversation continuity.
  const { data: history } = await supabase
    .from("communications")
    .select("direction, message")
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: true })
    .limit(10);

  // Existing quotations let the agent resend/reference without re-pricing.
  const { data: existingQuotations } = await supabase
    .from("quotations")
    .select("quotation_number, status, total_amount, currency, arrival_date, departure_date, expiry_date")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(5);

  await supabase.from("communications").insert({
    organization_id: org.id,
    guest_id: guest?.id ?? null,
    lead_id: leadId,
    channel: inquiry.channel,
    direction: "inbound",
    message: inquiry.message,
    occurred_at: new Date().toISOString(),
  });

  const agentResult = await runInquiryAgent(
    {
      organizationId: org.id,
      leadId,
      guestId: guest?.id ?? null,
      channel: inquiry.channel,
      guestName,
      contactAddress: inquiry.contactAddress,
      message: inquiry.message,
      priorMessages: history ?? [],
      existingQuotations: existingQuotations ?? [],
    },
    supabase
  );

  const touchedQuotation = agentResult.quotationId !== null;

  // Level 3: pure informational, high-confidence, not escalated, no quotation
  // or booking request involved, and the org has opted in — safe to
  // auto-send. A resend of an existing quotation already happened for real
  // inside send_quotation, so it isn't re-sent here.
  const canAutoReply =
    org.ai_auto_reply_enabled &&
    !agentResult.escalate &&
    !touchedQuotation &&
    !agentResult.bookingRequested &&
    agentResult.confidence === "high" &&
    agentResult.needsMoreInfo.length === 0;

  let sendResult: { sent: boolean; reason?: string } | null = null;
  if (canAutoReply) {
    sendResult =
      inquiry.channel === "whatsapp"
        ? await sendWhatsAppMessage(inquiry.contactAddress, agentResult.replyDraft)
        : await sendEmail(inquiry.contactAddress, "Re: your inquiry", agentResult.replyDraft);
  }

  const autoSentReply = Boolean(sendResult?.sent);
  const status = agentResult.escalate
    ? "human_required"
    : agentResult.autoSentQuotation
      ? "sent"
      : autoSentReply
        ? "sent"
        : "pending";

  const actionSummary = agentResult.escalate
    ? `Escalated — ${agentResult.escalationReason ?? "no confident, grounded answer"}`
    : agentResult.bookingRequested
      ? `Booking confirmation requested for ${agentResult.quotationNumber} — staff notified, awaiting reply`
      : agentResult.autoSentQuotation
        ? `Resent existing quotation ${agentResult.quotationNumber} (Level 3)`
        : agentResult.sendGated
          ? `Prepared quotation ${agentResult.quotationNumber} (${agentResult.quotationCurrency} ${agentResult.quotationTotal}) — awaiting approval to send`
          : autoSentReply
            ? "Auto-replied (Level 3 — informational, high confidence)"
            : "Drafted reply, awaiting approval";

  const { data: draft, error: draftError } = await supabase
    .from("ai_drafts")
    .insert({
      organization_id: org.id,
      lead_id: leadId,
      guest_id: guest?.id ?? null,
      channel: inquiry.channel,
      contact_address: inquiry.contactAddress,
      inbound_message: inquiry.message,
      draft_reply: agentResult.replyDraft,
      suggested_quotation: null,
      quotation_id: agentResult.quotationId,
      needs_more_info: agentResult.needsMoreInfo,
      confidence: agentResult.confidence,
      tool_log: agentResult.toolLog,
      model_used: agentResult.modelUsed,
      intent: agentResult.intent,
      escalated: agentResult.escalate,
      escalation_reason: agentResult.escalationReason,
      ai_action_summary: actionSummary,
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (draftError) throw new Error(draftError.message);

  if (autoSentReply) {
    await supabase.from("communications").insert({
      organization_id: org.id,
      guest_id: guest?.id ?? null,
      lead_id: leadId,
      channel: inquiry.channel,
      direction: "outbound",
      message: agentResult.replyDraft,
    });
  }

  // Notify staff for anything that isn't a fully-automatic Level 3 reply.
  // (Booking requests already got their own notification from create_booking.)
  if (status !== "sent" && !agentResult.bookingRequested) {
    const { data: staff } = await supabase.from("profiles").select("id").eq("organization_id", org.id).eq("is_org_admin", true);
    if (staff && staff.length > 0) {
      await supabase.from("notifications").insert(
        staff.map((s) => ({
          user_id: s.id,
          organization_id: org.id,
          type: "inquiry_new" as const,
          title: agentResult.escalate ? "Guest inquiry needs a human" : "New AI-drafted reply ready for review",
          message: agentResult.escalate
            ? `${guestName ?? "A guest"} asked something Pixel AI couldn't answer confidently: ${agentResult.escalationReason ?? ""}`
            : `${guestName ?? "A guest"} messaged via ${inquiry.channel}. Pixel AI drafted a reply — review before sending.`,
          link: `/ai-inquiries/${draft.id}`,
        }))
      );
    }
  }

  return { leadId, draftId: draft.id, autoSent: status === "sent" };
}
