"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

function buildPayload(formData: FormData) {
  return {
    agent_code: String(formData.get("agent_code") ?? "").trim().toUpperCase(),
    company_name: String(formData.get("company_name") ?? "").trim(),
    contact_person: String(formData.get("contact_person") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
    country: String(formData.get("country") ?? "").trim() || null,
    market: String(formData.get("market") ?? "").trim() || null,
    credit_limit: formData.get("credit_limit") ? Number(formData.get("credit_limit")) : null,
    payment_terms: String(formData.get("payment_terms") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createAgent(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();

  const payload = { ...buildPayload(formData), organization_id: user.profile.organization_id, status: "active" as const };
  const { data, error } = await supabase.from("agents").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "agent",
    entityId: data.id,
    action: "created",
    newValue: payload,
  });

  revalidatePath("/agents");
  redirect(`/agents/${data.id}`);
}

export async function updateAgent(agentId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const { data: before } = await supabase.from("agents").select("*").eq("id", agentId).maybeSingle();

  const updates = { ...buildPayload(formData), status: String(formData.get("status") ?? "active") as "active" | "inactive" };
  const { error } = await supabase.from("agents").update(updates).eq("id", agentId);
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "agent",
    entityId: agentId,
    action: "updated",
    oldValue: before,
    newValue: updates,
  });

  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/agents");
  redirect(`/agents/${agentId}`);
}
