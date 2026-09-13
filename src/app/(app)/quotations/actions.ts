"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

function buildPayload(formData: FormData) {
  return {
    property_id: String(formData.get("property_id") ?? ""),
    lead_id: String(formData.get("lead_id") ?? "") || null,
    guest_id: String(formData.get("guest_id") ?? "") || null,
    arrival_date: String(formData.get("arrival_date") ?? "") || null,
    departure_date: String(formData.get("departure_date") ?? "") || null,
    room_type_id: String(formData.get("room_type_id") ?? "") || null,
    meal_plan: String(formData.get("meal_plan") ?? "").trim() || null,
    accommodation_amount: Number(formData.get("accommodation_amount") ?? 0),
    dive_amount: Number(formData.get("dive_amount") ?? 0),
    transfer_amount: Number(formData.get("transfer_amount") ?? 0),
    activities_amount: Number(formData.get("activities_amount") ?? 0),
    domestic_flight_amount: Number(formData.get("domestic_flight_amount") ?? 0),
    extras_amount: Number(formData.get("extras_amount") ?? 0),
    discount_amount: Number(formData.get("discount_amount") ?? 0),
    tax_amount: Number(formData.get("tax_amount") ?? 0),
    currency: String(formData.get("currency") ?? "USD").trim().toUpperCase(),
    expiry_date: String(formData.get("expiry_date") ?? "") || null,
    terms: String(formData.get("terms") ?? "").trim() || null,
  };
}

export async function createQuotation(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();

  const payload = { ...buildPayload(formData), organization_id: user.profile.organization_id, status: "draft" as const, created_by: user.id };
  const { data, error } = await supabase.from("quotations").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "quotation",
    entityId: data.id,
    action: "created",
    newValue: payload,
  });

  revalidatePath("/quotations");
  redirect(`/quotations/${data.id}`);
}

export async function updateQuotation(quotationId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const { data: before } = await supabase.from("quotations").select("*").eq("id", quotationId).maybeSingle();

  const updates = { ...buildPayload(formData), status: String(formData.get("status") ?? before?.status ?? "draft") as any };
  const { error } = await supabase.from("quotations").update(updates).eq("id", quotationId);
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "quotation",
    entityId: quotationId,
    action: updates.status !== before?.status ? "status_changed" : "updated",
    oldValue: before,
    newValue: updates,
  });

  revalidatePath(`/quotations/${quotationId}`);
  redirect(`/quotations/${quotationId}`);
}

export async function duplicateQuotation(quotationId: string) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const { data: original } = await supabase.from("quotations").select("*").eq("id", quotationId).maybeSingle();
  if (!original) throw new Error("Quotation not found.");

  const { id, quotation_number, created_at, updated_at, total_amount, status, converted_reservation_id, ...rest } = original as any;
  const { data, error } = await supabase
    .from("quotations")
    .insert({ ...rest, status: "draft", created_by: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/quotations");
  redirect(`/quotations/${data.id}`);
}

export async function convertQuotationToBooking(quotationId: string) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const { data: quotation } = await supabase.from("quotations").select("*").eq("id", quotationId).maybeSingle();
  if (!quotation) throw new Error("Quotation not found.");
  if (!quotation.guest_id) throw new Error("Assign a guest to this quotation before converting.");
  if (!quotation.arrival_date || !quotation.departure_date) throw new Error("Set arrival and departure dates before converting.");

  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      organization_id: quotation.organization_id,
      property_id: quotation.property_id,
      guest_id: quotation.guest_id,
      arrival_date: quotation.arrival_date,
      departure_date: quotation.departure_date,
      room_type_id: quotation.room_type_id,
      meal_plan: quotation.meal_plan,
      booking_source: "direct",
      currency: quotation.currency,
      accommodation_amount: quotation.accommodation_amount,
      dive_amount: quotation.dive_amount,
      transfer_amount: quotation.transfer_amount,
      extra_amount: quotation.activities_amount + quotation.extras_amount,
      domestic_flight_amount: quotation.domestic_flight_amount,
      discount_amount: quotation.discount_amount,
      tax_amount: quotation.tax_amount,
      booking_status: "confirmed",
      source_app: "pixel_core",
      sync_status: "synced",
      created_by: user.id,
    })
    .select("id, booking_number")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("quotations").update({ status: "converted", converted_reservation_id: reservation.id }).eq("id", quotationId);

  await supabase.from("events").insert([
    {
      event_type: "QUOTATION_ACCEPTED",
      source_app: "pixel_core",
      entity_type: "quotation",
      entity_id: quotationId,
      payload: { reservation_id: reservation.id },
      status: "completed",
      processed_at: new Date().toISOString(),
    },
    {
      event_type: "BOOKING_CREATED",
      source_app: "pixel_core",
      entity_type: "reservation",
      entity_id: reservation.id,
      payload: { booking_number: reservation.booking_number, from_quotation: quotationId },
      status: "pending",
    },
  ]);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "quotation",
    entityId: quotationId,
    action: "status_changed",
    newValue: { status: "converted", reservationId: reservation.id },
  });

  revalidatePath(`/quotations/${quotationId}`);
  redirect(`/reservations/${reservation.id}`);
}
