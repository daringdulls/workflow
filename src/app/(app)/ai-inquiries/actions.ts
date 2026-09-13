"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";
import { sendWhatsAppMessage } from "@/lib/notify/whatsapp";
import { sendEmail } from "@/lib/notify/email";

export async function approveAndSend(draftId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("Not signed in.");
  const supabase = createClient();

  const { data: draft } = await supabase.from("ai_drafts").select("*").eq("id", draftId).maybeSingle();
  if (!draft) throw new Error("Draft not found.");

  const finalReply = String(formData.get("draft_reply") ?? draft.draft_reply).trim();

  // The agent may already have created a real draft quotation via the
  // create_quotation tool (quotation_id is set) — don't re-create it, just
  // reference it. Only build one from the legacy suggested_quotation JSON
  // for older rows that predate the tool-based flow.
  let quotationId: string | null = draft.quotation_id;
  const includeLegacyQuote = !quotationId && formData.get("create_quotation") === "on" && draft.suggested_quotation;

  if (includeLegacyQuote) {
    const q = draft.suggested_quotation as any;
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("organization_id", draft.organization_id)
      .eq("code", q.property_code)
      .maybeSingle();

    let roomTypeId: string | null = null;
    if (property && q.room_type_code) {
      const { data: rt } = await supabase.from("room_types").select("id").eq("property_id", property.id).eq("code", q.room_type_code).maybeSingle();
      roomTypeId = rt?.id ?? null;
    }

    if (property) {
      const { data: quotation, error } = await supabase
        .from("quotations")
        .insert({
          organization_id: draft.organization_id,
          property_id: property.id,
          lead_id: draft.lead_id,
          guest_id: draft.guest_id,
          arrival_date: q.arrival_date,
          departure_date: q.departure_date,
          room_type_id: roomTypeId,
          meal_plan: q.meal_plan,
          accommodation_amount: q.accommodation_amount,
          currency: q.currency,
          status: "draft",
          terms: q.notes,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      quotationId = quotation.id;
    }
  }

  let sendResult: { sent: boolean; reason?: string } = { sent: false, reason: "No send channel configured." };
  if (draft.channel === "whatsapp") {
    sendResult = await sendWhatsAppMessage(draft.contact_address!, finalReply);
  } else if (draft.channel === "email") {
    sendResult = await sendEmail(draft.contact_address!, "Re: your inquiry", finalReply);
  }

  if (quotationId && sendResult.sent) {
    await supabase.from("quotations").update({ status: "sent" }).eq("id", quotationId).eq("status", "draft");
  }

  await supabase
    .from("ai_drafts")
    .update({
      status: sendResult.sent ? "sent" : "approved",
      draft_reply: finalReply,
      quotation_id: quotationId,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      sent_at: sendResult.sent ? new Date().toISOString() : null,
      ai_action_summary: `Approved by ${user.email}${sendResult.sent ? " · sent" : " · not auto-sent, send manually"}`,
    })
    .eq("id", draftId);

  if (draft.lead_id) {
    await supabase.from("communications").insert({
      organization_id: draft.organization_id,
      guest_id: draft.guest_id,
      lead_id: draft.lead_id,
      channel: draft.channel,
      direction: "outbound",
      message: finalReply,
      created_by: user.id,
    });
  }

  await recordAudit({
    organizationId: draft.organization_id,
    userId: user.id,
    entityType: "ai_draft",
    entityId: draftId,
    action: "status_changed",
    newValue: { status: sendResult.sent ? "sent" : "approved", sendResult, quotationId },
  });

  revalidatePath("/ai-inquiries");
  revalidatePath(`/ai-inquiries/${draftId}`);
  redirect(`/ai-inquiries/${draftId}?sent=${sendResult.sent}${sendResult.reason ? `&reason=${encodeURIComponent(sendResult.reason)}` : ""}`);
}

export async function rejectDraft(draftId: string) {
  const user = await getCurrentUser();
  if (!user?.profile) throw new Error("Not signed in.");
  const supabase = createClient();

  await supabase
    .from("ai_drafts")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      ai_action_summary: `Rejected by ${user.email}`,
    })
    .eq("id", draftId);

  revalidatePath("/ai-inquiries");
  revalidatePath(`/ai-inquiries/${draftId}`);
}
