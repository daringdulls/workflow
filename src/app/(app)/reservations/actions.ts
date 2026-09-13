"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";
import type { BookingStatus } from "@/lib/database.types";

// Pixel PMS owns room assignment and check-in/out status in production. Until
// Pixel PMS is connected, Pixel Core allows these operational fields to be
// updated directly here (every change is audited as a manual override).
export async function updateReservationOperations(reservationId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile) throw new Error("Not signed in.");
  const supabase = createClient();

  const { data: before } = await supabase.from("reservations").select("*").eq("id", reservationId).maybeSingle();
  if (!before) throw new Error("Reservation not found.");

  const updates = {
    room_id: String(formData.get("room_id") ?? "") || null,
    booking_status: String(formData.get("booking_status") ?? before.booking_status) as BookingStatus,
    internal_notes: String(formData.get("internal_notes") ?? "").trim() || null,
    amount_paid: Number(formData.get("amount_paid") ?? before.amount_paid),
  };

  const { error } = await supabase.from("reservations").update(updates).eq("id", reservationId);
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: before.organization_id,
    userId: user.id,
    entityType: "reservation",
    entityId: reservationId,
    action: updates.booking_status !== before.booking_status ? "status_changed" : "manual_override",
    oldValue: before,
    newValue: updates,
  });

  // Emit an internal event so downstream Pixel apps can react to the change.
  await supabase.from("events").insert({
    event_type: updates.booking_status === "checked_in" ? "CHECKED_IN" : updates.booking_status === "checked_out" ? "CHECKED_OUT" : "BOOKING_UPDATED",
    source_app: "pixel_core",
    target_app: null,
    entity_type: "reservation",
    entity_id: reservationId,
    payload: updates,
    status: "pending",
  });

  revalidatePath(`/reservations/${reservationId}`);
  redirect(`/reservations/${reservationId}`);
}
