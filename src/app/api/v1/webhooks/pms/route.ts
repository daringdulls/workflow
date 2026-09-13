import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhookSecret } from "@/lib/webhook-auth";

// Pixel PMS owns room assignment and check-in/out status. It pushes those
// operational updates back into Pixel Core, which then relays them on to
// Pixel Booking Manager (and, on checkout, Pixel Reputation Manager).

const payloadSchema = z.object({
  booking_number: z.string().optional(),
  source_record_id: z.string().optional(),
  room_number: z.string().optional().nullable(),
  status: z.enum(["checked_in", "checked_out"]),
});

export async function POST(request: NextRequest) {
  if (!verifyWebhookSecret(request, "pms")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const startedAt = new Date().toISOString();
  let body: z.infer<typeof payloadSchema>;
  try {
    body = payloadSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid payload", details: String(err) }, { status: 400 });
  }
  if (!body.booking_number && !body.source_record_id) {
    return NextResponse.json({ error: "booking_number or source_record_id is required" }, { status: 400 });
  }

  let query = supabase.from("reservations").select("*").limit(1);
  query = body.booking_number ? query.eq("booking_number", body.booking_number) : query.eq("source_record_id", body.source_record_id!);
  const { data: reservation } = await query.maybeSingle();

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  let roomId: string | null = reservation.room_id;
  if (body.room_number) {
    const { data: room } = await supabase
      .from("rooms")
      .select("id")
      .eq("property_id", reservation.property_id)
      .eq("room_number", body.room_number)
      .maybeSingle();
    roomId = room?.id ?? roomId;
    if (room) await supabase.from("rooms").update({ status: body.status === "checked_in" ? "occupied" : "dirty" }).eq("id", room.id);
  }

  await supabase
    .from("reservations")
    .update({ booking_status: body.status, room_id: roomId, last_synced_at: new Date().toISOString() })
    .eq("id", reservation.id);

  const eventType = body.status === "checked_in" ? "CHECKED_IN" : "CHECKED_OUT";
  await supabase.from("events").insert({
    event_type: eventType,
    source_app: "pms",
    target_app: body.status === "checked_out" ? "reputation" : "booking_manager",
    entity_type: "reservation",
    entity_id: reservation.id,
    payload: { booking_number: reservation.booking_number, room_number: body.room_number ?? null },
    status: "pending",
  });

  // On checkout, hand the guest off to Pixel Reputation Manager (guest, property, checkout date, contact).
  if (body.status === "checked_out") {
    await supabase.from("events").insert({
      event_type: "REVIEW_RECEIVED",
      source_app: "pixel_core",
      target_app: "reputation",
      entity_type: "guest",
      entity_id: reservation.guest_id,
      payload: { property_id: reservation.property_id, checkout_date: reservation.departure_date },
      status: "pending",
    });
  }

  await supabase.from("app_connections").update({ status: "connected", last_sync_at: new Date().toISOString() }).eq("app_key", "pms");
  await supabase.from("sync_logs").insert({
    app_key: "pms",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    records_received: 1,
    records_sent: 0,
    failed_records: 0,
    status: "synced",
    details: { booking_number: reservation.booking_number, event_type: eventType },
  });

  return NextResponse.json({ ok: true, reservation_id: reservation.id, event: eventType });
}
