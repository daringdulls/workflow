import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, logAudit } from "@/lib/pos/api-helpers";
import { recomputeOrder } from "@/lib/pos/order-calc";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  const { id } = await params;

  const orderRows = await sql`
    SELECT o.*, t.name AS table_name, c.name AS customer_name, w.name AS waiter_name
    FROM pos_orders o
    LEFT JOIN pos_tables t ON t.id = o.table_id
    LEFT JOIN pos_customers c ON c.id = o.customer_id
    LEFT JOIN pos_staff w ON w.id = o.waiter_id
    WHERE o.id = ${id} AND o.outlet_id = ${guard.session.outletId};
  `;
  if (orderRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await sql`SELECT * FROM pos_order_items WHERE order_id = ${id} ORDER BY created_at;`;
  const payments = await sql`SELECT * FROM pos_payments WHERE order_id = ${id} ORDER BY created_at;`;

  return NextResponse.json({ ...orderRows[0], items, payments });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("pos");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();

  const existingRows = await sql`SELECT * FROM pos_orders WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  if (existingRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const existing = existingRows[0];

  const nextTableId = b.table_id !== undefined ? b.table_id : existing.table_id;

  const rows = await sql`
    UPDATE pos_orders SET
      order_type = ${b.order_type ?? existing.order_type},
      table_id = ${nextTableId},
      customer_id = ${b.customer_id !== undefined ? b.customer_id : existing.customer_id},
      waiter_id = ${b.waiter_id !== undefined ? b.waiter_id : existing.waiter_id},
      guest_count = ${b.guest_count ?? existing.guest_count},
      notes = ${b.notes !== undefined ? b.notes : existing.notes},
      room_number = ${b.room_number !== undefined ? b.room_number : existing.room_number},
      guest_name = ${b.guest_name !== undefined ? b.guest_name : existing.guest_name},
      hotel_name = ${b.hotel_name !== undefined ? b.hotel_name : existing.hotel_name},
      delivery_address = ${b.delivery_address !== undefined ? b.delivery_address : existing.delivery_address},
      delivery_phone = ${b.delivery_phone !== undefined ? b.delivery_phone : existing.delivery_phone},
      delivery_driver = ${b.delivery_driver !== undefined ? b.delivery_driver : existing.delivery_driver},
      delivery_fee = ${b.delivery_fee ?? existing.delivery_fee},
      pickup_time = ${b.pickup_time !== undefined ? b.pickup_time : existing.pickup_time},
      tip_amount = ${b.tip_amount ?? existing.tip_amount},
      status = ${b.status ?? existing.status},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *;
  `;

  if (nextTableId !== existing.table_id) {
    if (existing.table_id) {
      const stillOpen = await sql`
        SELECT COUNT(*)::int AS count FROM pos_orders
        WHERE table_id = ${existing.table_id} AND id != ${id} AND status NOT IN ('paid', 'void', 'cancelled');
      `;
      if (stillOpen[0].count === 0) await sql`UPDATE pos_tables SET status = 'available' WHERE id = ${existing.table_id};`;
    }
    if (nextTableId) await sql`UPDATE pos_tables SET status = 'occupied' WHERE id = ${nextTableId};`;
    await logAudit({
      outletId: guard.session.outletId,
      staffId: guard.session.staffId,
      action: "order_table_transfer",
      entityType: "order",
      entityId: Number(id),
      oldValue: { table_id: existing.table_id },
      newValue: { table_id: nextTableId },
    });
  }

  if (b.tip_amount !== undefined || b.delivery_fee !== undefined) {
    await recomputeOrder(Number(id));
  }

  const finalRows = await sql`SELECT * FROM pos_orders WHERE id = ${id};`;
  return NextResponse.json(finalRows[0]);
}
