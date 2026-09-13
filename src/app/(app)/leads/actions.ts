"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

function buildPayload(formData: FormData) {
  return {
    property_id: String(formData.get("property_id") ?? "") || null,
    guest_name: String(formData.get("guest_name") ?? "").trim(),
    contact_email: String(formData.get("contact_email") ?? "").trim() || null,
    contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
    source: String(formData.get("source") ?? "other") as any,
    travel_start_date: String(formData.get("travel_start_date") ?? "") || null,
    travel_end_date: String(formData.get("travel_end_date") ?? "") || null,
    adults: Number(formData.get("adults") ?? 1),
    children: Number(formData.get("children") ?? 0),
    requirements: String(formData.get("requirements") ?? "").trim() || null,
    assigned_to: String(formData.get("assigned_to") ?? "") || null,
    follow_up_date: String(formData.get("follow_up_date") ?? "") || null,
    estimated_value: formData.get("estimated_value") ? Number(formData.get("estimated_value")) : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createLead(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();

  const payload = { ...buildPayload(formData), organization_id: user.profile.organization_id, status: "new" as const, created_by: user.id };
  const { data, error } = await supabase.from("leads").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await supabase.from("events").insert({
    event_type: "INQUIRY_CREATED",
    source_app: "pixel_core",
    entity_type: "lead",
    entity_id: data.id,
    payload: { guest_name: payload.guest_name, source: payload.source },
    status: "pending",
  });

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "lead",
    entityId: data.id,
    action: "created",
    newValue: payload,
  });

  revalidatePath("/leads");
  redirect(`/leads/${data.id}`);
}

export async function updateLead(leadId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const { data: before } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();

  const updates = {
    ...buildPayload(formData),
    status: String(formData.get("status") ?? "new") as any,
    lost_reason: String(formData.get("lost_reason") ?? "") || null,
  };

  const { error } = await supabase.from("leads").update(updates).eq("id", leadId);
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "lead",
    entityId: leadId,
    action: updates.status !== before?.status ? "status_changed" : "updated",
    oldValue: before,
    newValue: updates,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  redirect(`/leads/${leadId}`);
}
