import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const rows = await sql`
    SELECT r.*, t.name AS table_name, a.name AS area_name
    FROM pos_reservations r
    LEFT JOIN pos_tables t ON t.id = r.table_id
    LEFT JOIN pos_dining_areas a ON a.id = r.area_id
    WHERE r.outlet_id = ${guard.session.outletId}
      AND (${date}::date IS NULL OR r.reservation_date = ${date}::date)
    ORDER BY r.reservation_date, r.reservation_time;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("reservations");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const b = await req.json();
  if (!b.customer_name || !b.reservation_date || !b.reservation_time) {
    return NextResponse.json({ error: "customer_name, reservation_date and reservation_time are required" }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO pos_reservations (
      outlet_id, customer_id, customer_name, contact, reservation_date, reservation_time, guests,
      table_id, area_id, special_requests, occasion, deposit, source, status
    ) VALUES (
      ${guard.session.outletId}, ${b.customer_id ?? null}, ${b.customer_name}, ${b.contact ?? null},
      ${b.reservation_date}, ${b.reservation_time}, ${b.guests ?? 2}, ${b.table_id ?? null}, ${b.area_id ?? null},
      ${b.special_requests ?? null}, ${b.occasion ?? null}, ${b.deposit ?? 0}, ${b.source ?? "phone"}, ${b.status ?? "pending"}
    )
    RETURNING *;
  `;
  if (b.table_id && (b.status ?? "pending") === "confirmed") {
    await sql`UPDATE pos_tables SET status = 'reserved' WHERE id = ${b.table_id} AND status = 'available';`;
  }
  return NextResponse.json(rows[0], { status: 201 });
}
