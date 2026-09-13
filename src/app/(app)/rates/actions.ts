"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

function buildPayload(formData: FormData) {
  return {
    property_id: String(formData.get("property_id") ?? ""),
    room_type_id: String(formData.get("room_type_id") ?? "") || null,
    rate_type: String(formData.get("rate_type") ?? "public") as any,
    name: String(formData.get("name") ?? "").trim(),
    meal_plan: String(formData.get("meal_plan") ?? "").trim() || null,
    market: String(formData.get("market") ?? "").trim() || null,
    agent_id: String(formData.get("agent_id") ?? "") || null,
    currency: String(formData.get("currency") ?? "USD").trim().toUpperCase(),
    amount: Number(formData.get("amount") ?? 0),
    start_date: String(formData.get("start_date") ?? ""),
    end_date: String(formData.get("end_date") ?? ""),
    min_stay: formData.get("min_stay") ? Number(formData.get("min_stay")) : null,
    max_stay: formData.get("max_stay") ? Number(formData.get("max_stay")) : null,
    booking_window: String(formData.get("booking_window") ?? "").trim() || null,
    cancellation_policy: String(formData.get("cancellation_policy") ?? "").trim() || null,
  };
}

export async function createRatePlan(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();

  const payload = { ...buildPayload(formData), organization_id: user.profile.organization_id, status: "active" as const };
  const { data, error } = await supabase.from("rate_plans").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "rate_plan",
    entityId: data.id,
    action: "rate_changed",
    newValue: payload,
  });

  revalidatePath("/rates");
  redirect(`/rates/${data.id}`);
}

export async function updateRatePlan(rateId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const { data: before } = await supabase.from("rate_plans").select("*").eq("id", rateId).maybeSingle();

  const updates = { ...buildPayload(formData), status: String(formData.get("status") ?? "active") as "active" | "inactive" | "expired" };
  const { error } = await supabase.from("rate_plans").update(updates).eq("id", rateId);
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "rate_plan",
    entityId: rateId,
    action: "rate_changed",
    oldValue: before,
    newValue: updates,
  });

  revalidatePath(`/rates/${rateId}`);
  revalidatePath("/rates");
  redirect(`/rates/${rateId}`);
}
