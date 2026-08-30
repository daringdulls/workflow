import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";
import { recomputeOrder } from "@/lib/pos/order-calc";

// Splits selected order_items off into a brand-new order (same table/type),
// leaving the rest on the original — this is "split bill by item": each
// resulting order is billed independently. "Split bill equally" and
// "split payment across methods" are handled by /pay accepting multiple
// payment rows against one order instead.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("pos");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const { item_ids } = await req.json();
  if (!Array.isArray(item_ids) || item_ids.length === 0) {
    return NextResponse.json({ error: "item_ids is required" }, { status: 400 });
  }

  const orderRows = await sql`SELECT * FROM pos_orders WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  const order = orderRows[0];
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const outletRows = await sql`SELECT order_number_prefix FROM pos_outlets WHERE id = ${guard.session.outletId};`;
  const prefix = outletRows[0].order_number_prefix as string;

  const newOrderRows = await sql`
    INSERT INTO pos_orders (outlet_id, order_number, order_type, table_id, customer_id, waiter_id, cashier_id, guest_count, source)
    VALUES (${guard.session.outletId}, '', ${order.order_type}, ${order.table_id}, ${order.customer_id}, ${order.waiter_id}, ${guard.session.staffId}, ${order.guest_count}, 'pos')
    RETURNING *;
  `;
  const newOrder = newOrderRows[0];
  await sql`UPDATE pos_orders SET order_number = ${prefix + "-" + String(newOrder.id).padStart(5, "0")} WHERE id = ${newOrder.id};`;

  for (const itemId of item_ids) {
    await sql`UPDATE pos_order_items SET order_id = ${newOrder.id} WHERE id = ${itemId} AND order_id = ${id};`;
  }

  await recomputeOrder(Number(id));
  await recomputeOrder(newOrder.id);

  const finalOld = await sql`SELECT * FROM pos_orders WHERE id = ${id};`;
  const finalNew = await sql`SELECT * FROM pos_orders WHERE id = ${newOrder.id};`;
  return NextResponse.json({ original: finalOld[0], split: finalNew[0] });
}
