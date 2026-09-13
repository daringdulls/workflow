"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

function buildPayload(formData: FormData) {
  return {
    property_id: String(formData.get("property_id") ?? ""),
    transfer_type: String(formData.get("transfer_type") ?? "").trim(),
    direction: String(formData.get("direction") ?? "one_way") as "one_way" | "return",
    price_per_person: Number(formData.get("price_per_person") ?? 0),
    currency: String(formData.get("currency") ?? "USD").trim().toUpperCase(),
    start_date: String(formData.get("start_date") ?? ""),
    end_date: String(formData.get("end_date") ?? ""),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createTransferRate(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();

  const payload = { ...buildPayload(formData), organization_id: user.profile.organization_id, status: "active" as const };
  const { data, error } = await supabase.from("transfer_rates").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await recordAudit({ organizationId: user.profile.organization_id, userId: user.id, entityType: "transfer_rate", entityId: data.id, action: "rate_changed", newValue: payload });

  revalidatePath("/rates");
  redirect(`/rates/transfer-rates/${data.id}`);
}

export async function updateTransferRate(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const { data: before } = await supabase.from("transfer_rates").select("*").eq("id", id).maybeSingle();

  const updates = { ...buildPayload(formData), status: String(formData.get("status") ?? "active") as "active" | "inactive" | "expired" };
  const { error } = await supabase.from("transfer_rates").update(updates).eq("id", id);
  if (error) throw new Error(error.message);

  await recordAudit({ organizationId: user.profile.organization_id, userId: user.id, entityType: "transfer_rate", entityId: id, action: "rate_changed", oldValue: before, newValue: updates });

  revalidatePath("/rates");
  redirect(`/rates/transfer-rates/${id}`);
}
