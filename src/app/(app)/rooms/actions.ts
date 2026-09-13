"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

export async function createRoom(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();

  const [propertyId, roomTypeId] = String(formData.get("room_type_ref") ?? "").split(":");

  const payload = {
    property_id: propertyId ?? "",
    room_type_id: roomTypeId ?? "",
    room_number: String(formData.get("room_number") ?? "").trim(),
    floor: String(formData.get("floor") ?? "").trim() || null,
    status: "available" as const,
  };

  const { data, error } = await supabase.from("rooms").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "room",
    entityId: data.id,
    action: "created",
    newValue: payload,
  });

  revalidatePath("/rooms");
  redirect(`/rooms/${data.id}`);
}

export async function updateRoom(roomId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const { data: before } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();

  const updates = {
    room_number: String(formData.get("room_number") ?? "").trim(),
    floor: String(formData.get("floor") ?? "").trim() || null,
    status: String(formData.get("status") ?? "available") as any,
  };

  const { error } = await supabase.from("rooms").update(updates).eq("id", roomId);
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "room",
    entityId: roomId,
    action: updates.status !== before?.status ? "status_changed" : "updated",
    oldValue: before,
    newValue: updates,
  });

  revalidatePath(`/rooms/${roomId}`);
  revalidatePath("/rooms");
  redirect(`/rooms/${roomId}`);
}
