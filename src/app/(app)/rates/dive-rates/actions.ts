"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

function buildPayload(formData: FormData) {
  return {
    property_id: String(formData.get("property_id") ?? ""),
    package_name: String(formData.get("package_name") ?? "").trim(),
    dives_included: Number(formData.get("dives_included") ?? 0),
    price_per_person: Number(formData.get("price_per_person") ?? 0),
    currency: String(formData.get("currency") ?? "USD").trim().toUpperCase(),
    min_participants: Number(formData.get("min_participants") ?? 1),
    start_date: String(formData.get("start_date") ?? ""),
    end_date: String(formData.get("end_date") ?? ""),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createDiveRate(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();

  const payload = { ...buildPayload(formData), organization_id: user.profile.organization_id, status: "active" as const };
  const { data, error } = await supabase.from("dive_rates").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await recordAudit({ organizationId: user.profile.organization_id, userId: user.id, entityType: "dive_rate", entityId: data.id, action: "rate_changed", newValue: payload });

  revalidatePath("/rates");
  redirect(`/rates/dive-rates/${data.id}`);
}

export async function updateDiveRate(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const { data: before } = await supabase.from("dive_rates").select("*").eq("id", id).maybeSingle();

  const updates = { ...buildPayload(formData), status: String(formData.get("status") ?? "active") as "active" | "inactive" | "expired" };
  const { error } = await supabase.from("dive_rates").update(updates).eq("id", id);
  if (error) throw new Error(error.message);

  await recordAudit({ organizationId: user.profile.organization_id, userId: user.id, entityType: "dive_rate", entityId: id, action: "rate_changed", oldValue: before, newValue: updates });

  revalidatePath("/rates");
  redirect(`/rates/dive-rates/${id}`);
}
