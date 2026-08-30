import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

// Marks all (or selected) line items as received: bumps ingredient stock,
// updates the ingredient's latest cost, and logs a purchase stock movement
// per line — this is the Goods Received Note step.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("purchasing");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const itemIds: number[] | null = Array.isArray(b.item_ids) ? b.item_ids : null;

  const poRows = await sql`SELECT * FROM pos_purchase_orders WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  if (poRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await sql`
    SELECT * FROM pos_purchase_order_items
    WHERE po_id = ${id} AND received = false
      AND (${itemIds}::int[] IS NULL OR id = ANY(${itemIds}::int[]));
  `;

  for (const item of items) {
    if (item.ingredient_id) {
      await sql`UPDATE pos_ingredients SET stock_qty = stock_qty + ${item.quantity}, cost_per_unit = ${item.unit_cost} WHERE id = ${item.ingredient_id};`;
      await sql`
        INSERT INTO pos_stock_movements (outlet_id, ingredient_id, type, quantity, unit_cost, reference, staff_id)
        VALUES (${guard.session.outletId}, ${item.ingredient_id}, 'purchase', ${item.quantity}, ${item.unit_cost}, ${"PO #" + id}, ${guard.session.staffId});
      `;
    }
    await sql`UPDATE pos_purchase_order_items SET received = true WHERE id = ${item.id};`;
  }

  const remaining = await sql`SELECT COUNT(*)::int AS count FROM pos_purchase_order_items WHERE po_id = ${id} AND received = false;`;
  if (remaining[0].count === 0) {
    await sql`UPDATE pos_purchase_orders SET status = 'received' WHERE id = ${id};`;
  }

  const updatedPo = await sql`SELECT * FROM pos_purchase_orders WHERE id = ${id};`;
  const updatedItems = await sql`SELECT * FROM pos_purchase_order_items WHERE po_id = ${id};`;
  return NextResponse.json({ ...updatedPo[0], items: updatedItems });
}
