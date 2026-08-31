import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

// Kitchen/bar staff move a ticket through new -> accepted -> preparing ->
// ready -> served. Separate from the general order-items PATCH route
// because kitchen staff hold the "kitchen" permission, not "pos".
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("kitchen");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const { status } = await req.json();

  const rows = await sql`
    SELECT oi.* FROM pos_order_items oi JOIN pos_orders o ON o.id = oi.order_id
    WHERE oi.id = ${id} AND o.outlet_id = ${guard.session.outletId};
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await sql`
    UPDATE pos_order_items SET
      status = ${status},
      ready_at = ${status === "ready" ? new Date().toISOString() : rows[0].ready_at},
      served_at = ${status === "served" ? new Date().toISOString() : rows[0].served_at}
    WHERE id = ${id}
    RETURNING *;
  `;

  const orderItemsLeft = await sql`
    SELECT COUNT(*)::int AS count FROM pos_order_items
    WHERE order_id = ${rows[0].order_id} AND is_void = false AND status NOT IN ('ready', 'served', 'cancelled');
  `;
  if (orderItemsLeft[0].count === 0) {
    await sql`UPDATE pos_orders SET status = 'ready', updated_at = now() WHERE id = ${rows[0].order_id} AND status = 'sent_to_kitchen';`;
  }

  return NextResponse.json(updated[0]);
}
