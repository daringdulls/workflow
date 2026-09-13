import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhookSecret } from "@/lib/webhook-auth";

// Pixel Restaurant Order Manager owns order data itself; Pixel Core only
// records that an order happened, for cross-ecosystem activity and reporting.

const payloadSchema = z.object({
  external_order_id: z.string().min(1),
  booking_number: z.string().optional().nullable(),
  guest_id: z.string().uuid().optional().nullable(),
  amount: z.number().optional(),
  currency: z.string().optional().default("USD"),
});

export async function POST(request: NextRequest) {
  if (!verifyWebhookSecret(request, "restaurant")) {
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

  let reservationId: string | null = null;
  if (body.booking_number) {
    const { data } = await supabase.from("reservations").select("id, guest_id, property_id").eq("booking_number", body.booking_number).maybeSingle();
    reservationId = data?.id ?? null;
    if (data && body.amount) {
      await supabase.from("pos_transactions").insert({
        property_id: data.property_id,
        outlet: "Restaurant",
        guest_id: body.guest_id ?? data.guest_id,
        reservation_id: data.id,
        transaction_type: "restaurant",
        amount: body.amount,
        currency: body.currency ?? "USD",
        payment_method: "room_charge",
        status: "completed",
      });
    }
  }

  await supabase.from("events").insert({
    event_type: "RESTAURANT_ORDER_CREATED",
    source_app: "restaurant",
    entity_type: "reservation",
    entity_id: reservationId,
    payload: { external_order_id: body.external_order_id, amount: body.amount ?? null },
    status: "completed",
    processed_at: new Date().toISOString(),
  });

  await supabase.from("app_connections").update({ status: "connected", last_sync_at: new Date().toISOString() }).eq("app_key", "restaurant");
  await supabase.from("sync_logs").insert({
    app_key: "restaurant",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    records_received: 1,
    status: "synced",
    details: { external_order_id: body.external_order_id },
  });

  return NextResponse.json({ ok: true });
}
