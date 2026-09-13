import { createServiceClient } from "@/lib/supabase/server";
import { runInquiryAgent } from "@/lib/ai-agent";

export interface InboundInquiry {
  channel: "whatsapp" | "email";
  contactAddress: string; // phone number (whatsapp) or email address
  guestName: string | null;
  message: string;
}

/**
 * Shared pipeline for every inbound B2C channel: resolve the organization,
 * match/create the guest and lead, log the inbound message, run the Pixel AI
 * agent, and leave a draft for staff to review — nothing is sent to the guest
 * automatically.
 */
export async function handleInboundInquiry(inquiry: InboundInquiry) {
  const supabase = createServiceClient();
  const orgSlug = process.env.PIXEL_DEFAULT_ORGANIZATION_SLUG;
  if (!orgSlug) {
    throw new Error("PIXEL_DEFAULT_ORGANIZATION_SLUG is not configured.");
  }

  const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
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
      channel: inquiry.channel,
      guestName,
      contactAddress: inquiry.contactAddress,
      message: inquiry.message,
    },
    supabase
  );

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
      suggested_quotation: agentResult.suggestedQuotation,
      needs_more_info: agentResult.needsMoreInfo,
      confidence: agentResult.confidence,
      tool_log: agentResult.toolLog,
      model_used: agentResult.modelUsed,
      status: "pending",
    })
    .select("id")
    .single();
  if (draftError) throw new Error(draftError.message);

  const { data: staff } = await supabase.from("profiles").select("id").eq("organization_id", org.id).eq("is_org_admin", true);
  if (staff && staff.length > 0) {
    await supabase.from("notifications").insert(
      staff.map((s) => ({
        user_id: s.id,
        organization_id: org.id,
        type: "inquiry_new" as const,
        title: "New AI-drafted reply ready for review",
        message: `${guestName ?? "A guest"} messaged via ${inquiry.channel}. Pixel AI drafted a reply — review before sending.`,
        link: `/ai-inquiries/${draft.id}`,
      }))
    );
  }

  return { leadId, draftId: draft.id };
}
