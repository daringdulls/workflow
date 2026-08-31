import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";
import { recomputeOrder } from "@/lib/pos/order-calc";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("pos");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();

  const orderRows = await sql`SELECT * FROM pos_orders WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  if (orderRows.length === 0) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const order = orderRows[0];

  let name = b.name_snapshot;
  let unitPrice = b.unit_price;
  let station = b.station ?? "Main Kitchen";

  if (b.menu_item_id) {
    const itemRows = await sql`SELECT * FROM pos_menu_items WHERE id = ${b.menu_item_id} AND outlet_id = ${guard.session.outletId};`;
    const menuItem = itemRows[0];
    if (!menuItem) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    name = menuItem.name as string;
    station = menuItem.station as string;
    unitPrice =
      order.order_type === "takeaway" && menuItem.takeaway_price != null
        ? menuItem.takeaway_price
        : order.order_type === "delivery" && menuItem.delivery_price != null
        ? menuItem.delivery_price
        : menuItem.price;
  }

  if (!name || unitPrice == null) {
    return NextResponse.json({ error: "menu_item_id (or name_snapshot + unit_price) is required" }, { status: 400 });
  }

  const isComp = Boolean(b.is_complimentary) || order.order_type === "complimentary" || order.order_type === "staff_meal";

  const rows = await sql`
    INSERT INTO pos_order_items (order_id, menu_item_id, name_snapshot, quantity, unit_price, modifiers, notes, kitchen_notes, station, is_complimentary)
    VALUES (
      ${id}, ${b.menu_item_id ?? null}, ${name}, ${b.quantity ?? 1}, ${unitPrice},
      ${JSON.stringify(b.modifiers ?? [])}, ${b.notes ?? null}, ${b.kitchen_notes ?? null}, ${station}, ${isComp}
    )
    RETURNING *;
  `;

  await recomputeOrder(Number(id));
  return NextResponse.json(rows[0], { status: 201 });
}
