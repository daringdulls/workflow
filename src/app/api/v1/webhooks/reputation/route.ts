import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhookSecret } from "@/lib/webhook-auth";

// Pixel Reputation Manager owns reviews and responses; it pushes new reviews
// back to Pixel Core so they surface on the guest profile and dashboard.

const payloadSchema = z.object({
  guest_id: z.string().uuid().optional().nullable(),
  guest_email: z.string().email().optional().nullable(),
  property_code: z.string().min(1),
  organization_slug: z.string().min(1),
  platform: z.enum(["google", "tripadvisor", "booking_com", "expedia", "facebook", "other"]).default("other"),
  rating: z.number().min(0).max(5).optional().nullable(),
  review_text: z.string().optional().nullable(),
  review_date: z.string().optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional().nullable(),
});

export async function POST(request: NextRequest) {
  if (!verifyWebhookSecret(request, "reputation")) {
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

  const { data: org } = await supabase.from("organizations").select("id").eq("slug", body.organization_slug).maybeSingle();
  const { data: property } = org
    ? await supabase.from("properties").select("id").eq("organization_id", org.id).eq("code", body.property_code).maybeSingle()
    : { data: null };
  if (!property) {
    return NextResponse.json({ error: "Unknown organization_slug or property_code" }, { status: 422 });
  }

  let guestId = body.guest_id ?? null;
  if (!guestId && body.guest_email && org) {
    const { data: guest } = await supabase.from("guests").select("id").eq("organization_id", org.id).eq("email", body.guest_email).maybeSingle();
    guestId = guest?.id ?? null;
  }

  const { data: review, error } = await supabase
    .from("reviews")
    .insert({
      guest_id: guestId,
      property_id: property.id,
      platform: body.platform,
      rating: body.rating ?? null,
      review_text: body.review_text ?? null,
      review_date: body.review_date ?? new Date().toISOString().slice(0, 10),
      sentiment: body.sentiment ?? null,
      response_status: "pending",
    })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("events").insert({
    event_type: "REVIEW_RECEIVED",
    source_app: "reputation",
    entity_type: "review",
    entity_id: review.id,
    payload: { platform: body.platform, rating: body.rating ?? null },
    status: "completed",
    processed_at: new Date().toISOString(),
  });

  await supabase.from("app_connections").update({ status: "connected", last_sync_at: new Date().toISOString() }).eq("app_key", "reputation");
  await supabase.from("sync_logs").insert({
    app_key: "reputation",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    records_received: 1,
    status: "synced",
    details: { review_id: review.id },
  });

  return NextResponse.json({ ok: true, review_id: review.id });
}
