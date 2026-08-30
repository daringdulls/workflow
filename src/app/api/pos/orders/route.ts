import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const tableId = searchParams.get("table_id");
  const open = searchParams.get("open"); // "1" = any not-yet-closed-out order

  const rows = await sql`
    SELECT o.*, t.name AS table_name, c.name AS customer_name, w.name AS waiter_name
    FROM pos_orders o
    LEFT JOIN pos_tables t ON t.id = o.table_id
    LEFT JOIN pos_customers c ON c.id = o.customer_id
    LEFT JOIN pos_staff w ON w.id = o.waiter_id
    WHERE o.outlet_id = ${guard.session.outletId}
      AND (${status}::text IS NULL OR o.status = ${status})
      AND (${date}::date IS NULL OR o.created_at::date = ${date}::date)
      AND (${tableId}::int IS NULL OR o.table_id = ${tableId}::int)
      AND (${open}::text IS NULL OR o.status NOT IN ('paid', 'void', 'cancelled'))
    ORDER BY o.created_at DESC
    LIMIT 300;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("pos");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const b = await req.json();

  const outletRows = await sql`SELECT order_number_prefix FROM pos_outlets WHERE id = ${guard.session.outletId};`;
  const prefix = outletRows[0].order_number_prefix as string;

  const inserted = await sql`
    INSERT INTO pos_orders (
      outlet_id, order_number, order_type, table_id, customer_id, waiter_id, cashier_id, guest_count,
      notes, room_number, guest_name, hotel_name, source, delivery_address, delivery_phone, pickup_time
    ) VALUES (
      ${guard.session.outletId}, '', ${b.order_type ?? "dine_in"}, ${b.table_id ?? null}, ${b.customer_id ?? null},
      ${b.waiter_id ?? guard.session.staffId}, ${guard.session.staffId}, ${b.guest_count ?? 1},
      ${b.notes ?? null}, ${b.room_number ?? null}, ${b.guest_name ?? null}, ${b.hotel_name ?? null},
      'pos', ${b.delivery_address ?? null}, ${b.delivery_phone ?? null}, ${b.pickup_time ?? null}
    )
    RETURNING *;
  `;
  const order = inserted[0];
  const numbered = await sql`
    UPDATE pos_orders SET order_number = ${prefix + "-" + String(order.id).padStart(5, "0")} WHERE id = ${order.id} RETURNING *;
  `;

  if (b.table_id) {
    await sql`UPDATE pos_tables SET status = 'occupied' WHERE id = ${b.table_id};`;
  }

  return NextResponse.json({ ...numbered[0], items: [] }, { status: 201 });
}
