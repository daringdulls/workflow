"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

async function requireAccess() {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  return user;
}

export async function createRoomType(formData: FormData) {
  const user = await requireAccess();
  const supabase = createClient();

  const payload = {
    property_id: String(formData.get("property_id") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    max_guests: Number(formData.get("max_guests") ?? 2),
    base_occupancy: Number(formData.get("base_occupancy") ?? 2),
    description: String(formData.get("description") ?? "").trim() || null,
    status: "active" as const,
  };

  const { data, error } = await supabase.from("room_types").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile!.organization_id,
    userId: user.id,
    entityType: "room_type",
    entityId: data.id,
    action: "created",
    newValue: payload,
  });

  revalidatePath("/room-types");
  redirect(`/room-types/${data.id}`);
}

export async function updateRoomType(roomTypeId: string, formData: FormData) {
  const user = await requireAccess();
  const supabase = createClient();
  const { data: before } = await supabase.from("room_types").select("*").eq("id", roomTypeId).maybeSingle();

  const updates = {
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    max_guests: Number(formData.get("max_guests") ?? 2),
    base_occupancy: Number(formData.get("base_occupancy") ?? 2),
    description: String(formData.get("description") ?? "").trim() || null,
    status: String(formData.get("status") ?? "active") as "active" | "inactive",
  };

  const { error } = await supabase.from("room_types").update(updates).eq("id", roomTypeId);
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile!.organization_id,
    userId: user.id,
    entityType: "room_type",
    entityId: roomTypeId,
    action: "updated",
    oldValue: before,
    newValue: updates,
  });

  revalidatePath(`/room-types/${roomTypeId}`);
  revalidatePath("/room-types");
  redirect(`/room-types/${roomTypeId}`);
}
