"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

export async function recalculateAvailability(formData: FormData) {
  const propertyId = String(formData.get("property_id") ?? "");
  const roomTypeId = String(formData.get("room_type_id") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const supabase = createClient();

  const { error } = await supabase.rpc("recalculate_availability", {
    p_property_id: propertyId,
    p_room_type_id: roomTypeId,
    p_start: start,
    p_end: end,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/availability");
}

export async function overrideAvailability(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile) throw new Error("Not signed in.");
  const supabase = createClient();

  const propertyId = String(formData.get("property_id") ?? "");
  const roomTypeId = String(formData.get("room_type_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const adjustment = Number(formData.get("adjustment") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();

  const { error } = await supabase.from("availability_overrides").insert({
    property_id: propertyId,
    room_type_id: roomTypeId,
    date,
    adjustment,
    reason,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  // Apply the adjustment to that day's inventory so it's reflected immediately.
  const { data: existing } = await supabase
    .from("availability_daily")
    .select("*")
    .eq("property_id", propertyId)
    .eq("room_type_id", roomTypeId)
    .eq("date", date)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("availability_daily")
      .update({ total_inventory: existing.total_inventory + adjustment })
      .eq("id", existing.id);
  }

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "availability",
    entityId: `${propertyId}:${roomTypeId}:${date}`,
    action: "manual_override",
    newValue: { adjustment, reason },
  });

  revalidatePath("/availability");
}
