import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhookSecret } from "@/lib/webhook-auth";

// Pixel Booking Manager is the primary booking data source. Every reservation
// it creates or updates is synced here, keyed by (source_app, source_record_id)
// so re-delivery never creates duplicates.

const guestSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  passport_number: z.string().optional().nullable(),
});

const payloadSchema = z.object({
  source_record_id: z.string().min(1),
  organization_slug: z.string().min(1),
  property_code: z.string().min(1),
  guest: guestSchema,
  arrival_date: z.string(),
  departure_date: z.string(),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
  num_rooms: z.number().int().min(1).default(1),
  room_type_code: z.string().optional().nullable(),
  meal_plan: z.string().optional().nullable(),
  booking_source: z.string().optional().default("direct"),
  market: z.string().optional().nullable(),
  agent_code: z.string().optional().nullable(),
  currency: z.string().default("USD"),
  accommodation_amount: z.number().default(0),
  dive_amount: z.number().default(0),
  transfer_amount: z.number().default(0),
  extra_amount: z.number().default(0),
  domestic_flight_amount: z.number().default(0),
  discount_amount: z.number().default(0),
  tax_amount: z.number().default(0),
  amount_paid: z.number().default(0),
  invoice_number: z.string().optional().nullable(),
  booking_status: z.string().optional().default("confirmed"),
  payment_status: z.string().optional().default("unpaid"),
  special_requests: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  if (!verifyWebhookSecret(request, "booking_manager")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const startedAt = new Date().toISOString();

  let body: z.infer<typeof payloadSchema>;
  try {
    body = payloadSchema.parse(await request.json());
  } catch (err) {
    await logSyncFailure(supabase, startedAt, err);
    return NextResponse.json({ error: "Invalid payload", details: String(err) }, { status: 400 });
  }

  const { data: org } = await supabase.from("organizations").select("id").eq("slug", body.organization_slug).maybeSingle();
  const { data: property } = org
    ? await supabase.from("properties").select("id").eq("organization_id", org.id).eq("code", body.property_code).maybeSingle()
    : { data: null };

  if (!org || !property) {
    await logSyncFailure(supabase, startedAt, "Unknown organization_slug or property_code");
    return NextResponse.json({ error: "Unknown organization_slug or property_code" }, { status: 422 });
  }

  // Find or create the guest (dedupe by email or phone within the org).
  let guestId: string | null = null;
  const orFilters = [
    body.guest.email ? `email.eq.${body.guest.email}` : null,
    body.guest.phone ? `phone.eq.${body.guest.phone}` : null,
  ].filter(Boolean);
  if (orFilters.length > 0) {
    const { data: existingGuest } = await supabase
      .from("guests")
      .select("id")
      .eq("organization_id", org.id)
      .or(orFilters.join(","))
      .limit(1)
      .maybeSingle();
    guestId = existingGuest?.id ?? null;
  }
  if (!guestId) {
    const { data: newGuest, error: guestError } = await supabase
      .from("guests")
      .insert({
        organization_id: org.id,
        first_name: body.guest.first_name,
        last_name: body.guest.last_name,
        email: body.guest.email ?? null,
        phone: body.guest.phone ?? null,
        nationality: body.guest.nationality ?? null,
        passport_number: body.guest.passport_number ?? null,
      })
      .select("id")
      .single();
    if (guestError) {
      await logSyncFailure(supabase, startedAt, guestError.message);
      return NextResponse.json({ error: guestError.message }, { status: 500 });
    }
    guestId = newGuest.id;
    await supabase.from("events").insert({
      event_type: "GUEST_CREATED",
      source_app: "booking_manager",
      entity_type: "guest",
      entity_id: guestId,
      payload: { first_name: body.guest.first_name, last_name: body.guest.last_name },
      status: "completed",
      processed_at: new Date().toISOString(),
    });
  }

  let roomTypeId: string | null = null;
  if (body.room_type_code) {
    const { data: roomType } = await supabase
      .from("room_types")
      .select("id")
      .eq("property_id", property.id)
      .eq("code", body.room_type_code)
      .maybeSingle();
    roomTypeId = roomType?.id ?? null;
  }

  let agentId: string | null = null;
  if (body.agent_code) {
    const { data: agent } = await supabase.from("agents").select("id").eq("organization_id", org.id).eq("agent_code", body.agent_code).maybeSingle();
    agentId = agent?.id ?? null;
  }

  const { data: existingReservation } = await supabase
    .from("reservations")
    .select("id")
    .eq("source_app", "booking_manager")
    .eq("source_record_id", body.source_record_id)
    .maybeSingle();

  const reservationPayload = {
    organization_id: org.id,
    property_id: property.id,
    guest_id: guestId,
    external_booking_id: body.source_record_id,
    arrival_date: body.arrival_date,
    departure_date: body.departure_date,
    adults: body.adults,
    children: body.children,
    infants: body.infants,
    num_rooms: body.num_rooms,
    room_type_id: roomTypeId,
    meal_plan: body.meal_plan ?? null,
    booking_source: body.booking_source as any,
    market: body.market ?? null,
    agent_id: agentId,
    currency: body.currency,
    accommodation_amount: body.accommodation_amount,
    dive_amount: body.dive_amount,
    transfer_amount: body.transfer_amount,
    extra_amount: body.extra_amount,
    domestic_flight_amount: body.domestic_flight_amount,
    discount_amount: body.discount_amount,
    tax_amount: body.tax_amount,
    amount_paid: body.amount_paid,
    invoice_number: body.invoice_number ?? null,
    booking_status: body.booking_status as any,
    payment_status: body.payment_status as any,
    special_requests: body.special_requests ?? null,
    source_app: "booking_manager",
    source_record_id: body.source_record_id,
    last_synced_at: new Date().toISOString(),
    sync_status: "synced" as const,
  };

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .upsert(reservationPayload, { onConflict: "source_app,source_record_id" })
    .select("id, booking_number")
    .single();

  if (reservationError) {
    await logSyncFailure(supabase, startedAt, reservationError.message);
    return NextResponse.json({ error: reservationError.message }, { status: 500 });
  }

  const eventType = existingReservation ? "BOOKING_UPDATED" : "BOOKING_CREATED";
  await supabase.from("events").insert({
    event_type: eventType,
    source_app: "booking_manager",
    entity_type: "reservation",
    entity_id: reservation.id,
    payload: { booking_number: reservation.booking_number, source_record_id: body.source_record_id },
    status: "pending",
  });

  await supabase.from("app_connections").update({ status: "connected", last_sync_at: new Date().toISOString() }).eq("app_key", "booking_manager");
  await supabase.from("sync_logs").insert({
    app_key: "booking_manager",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    records_received: 1,
    records_sent: 0,
    failed_records: 0,
    status: "synced",
    details: { booking_number: reservation.booking_number, event_type: eventType },
  });

  // Relay onward to Pixel Stay PMS so the room is blocked there too. Never
  // lets a PMS outage fail this webhook — Booking Manager's write to Pixel
  // Core already succeeded above; the relay result only shows up in Sync
  // Monitor (app_key "pms").
  await relayToPms(supabase, body);

  return NextResponse.json({ ok: true, reservation_id: reservation.id, booking_number: reservation.booking_number, event: eventType });
}

async function logSyncFailure(supabase: ReturnType<typeof createServiceClient>, startedAt: string, error: unknown) {
  await supabase.from("app_connections").update({ status: "error" }).eq("app_key", "booking_manager");
  await supabase.from("sync_logs").insert({
    app_key: "booking_manager",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    records_received: 0,
    records_sent: 0,
    failed_records: 1,
    status: "error",
    details: { error: String(error) },
  });
}

async function relayToPms(supabase: ReturnType<typeof createServiceClient>, body: z.infer<typeof payloadSchema>) {
  const url = process.env.PMS_WEBHOOK_URL;
  const secret = process.env.PMS_WEBHOOK_SECRET;
  if (!url || !secret) return; // Not connected yet — nothing to relay to.

  const startedAt = new Date().toISOString();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-pixel-secret": secret },
      body: JSON.stringify({
        source_record_id: body.source_record_id,
        property_code: body.property_code,
        room_type_code: body.room_type_code ?? null,
        guest: {
          first_name: body.guest.first_name,
          last_name: body.guest.last_name,
          email: body.guest.email ?? null,
          phone: body.guest.phone ?? null,
        },
        arrival_date: body.arrival_date,
        departure_date: body.departure_date,
        adults: body.adults,
        children: body.children,
        num_rooms: body.num_rooms,
        booking_status: body.booking_status,
      }),
    });
    const responseBody = await res.json().catch(() => ({}));

    await supabase
      .from("app_connections")
      .update({ status: res.ok ? "connected" : "error", last_sync_at: new Date().toISOString() })
      .eq("app_key", "pms");
    await supabase.from("sync_logs").insert({
      app_key: "pms",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      records_received: 0,
      records_sent: res.ok ? 1 : 0,
      failed_records: res.ok ? 0 : 1,
      status: res.ok ? "synced" : "error",
      details: { source_record_id: body.source_record_id, response: responseBody },
    });
  } catch (err) {
    await supabase.from("app_connections").update({ status: "error" }).eq("app_key", "pms");
    await supabase.from("sync_logs").insert({
      app_key: "pms",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      records_received: 0,
      records_sent: 0,
      failed_records: 1,
      status: "error",
      details: { source_record_id: body.source_record_id, error: String(err) },
    });
  }
}
