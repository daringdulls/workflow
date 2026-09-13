"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

function buildPayload(formData: FormData) {
  const appliesTo = formData.getAll("applies_to").map(String);
  return {
    property_id: String(formData.get("property_id") ?? "") || null,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    promo_code: String(formData.get("promo_code") ?? "").trim() || null,
    discount_type: String(formData.get("discount_type") ?? "percentage") as "percentage" | "fixed_amount",
    discount_value: Number(formData.get("discount_value") ?? 0),
    trigger_min_nights: formData.get("trigger_min_nights") ? Number(formData.get("trigger_min_nights")) : null,
    applies_to: appliesTo.length > 0 ? appliesTo : ["accommodation"],
    start_date: String(formData.get("start_date") ?? ""),
    end_date: String(formData.get("end_date") ?? ""),
  };
}

export async function createOffer(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();

  const payload = { ...buildPayload(formData), organization_id: user.profile.organization_id, status: "active" as const };
  const { data, error } = await supabase.from("offers").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await recordAudit({ organizationId: user.profile.organization_id, userId: user.id, entityType: "offer", entityId: data.id, action: "created", newValue: payload });

  revalidatePath("/rates");
  redirect(`/rates/offers/${data.id}`);
}

export async function updateOffer(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const { data: before } = await supabase.from("offers").select("*").eq("id", id).maybeSingle();

  const updates = { ...buildPayload(formData), status: String(formData.get("status") ?? "active") as "active" | "inactive" | "expired" };
  const { error } = await supabase.from("offers").update(updates).eq("id", id);
  if (error) throw new Error(error.message);

  await recordAudit({ organizationId: user.profile.organization_id, userId: user.id, entityType: "offer", entityId: id, action: "updated", oldValue: before, newValue: updates });

  revalidatePath("/rates");
  redirect(`/rates/offers/${id}`);
}
