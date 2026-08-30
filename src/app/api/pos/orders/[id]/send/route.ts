import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, logAudit } from "@/lib/pos/api-helpers";

// Fires every not-yet-sent item to its kitchen station (KDS ticket) and
// flips the order into the kitchen pipeline.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("pos");
  if ("error" in guard) return guard.error;
  const { id } = await params;

  const orderRows = await sql`SELECT * FROM pos_orders WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  if (orderRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pending = await sql`
    UPDATE pos_order_items SET status = 'accepted', sent_at = now()
    WHERE order_id = ${id} AND sent_at IS NULL AND is_void = false
    RETURNING *;
  `;

  if (pending.length === 0) {
    return NextResponse.json({ error: "No new items to send" }, { status: 400 });
  }

  await sql`UPDATE pos_orders SET status = 'sent_to_kitchen', updated_at = now() WHERE id = ${id} AND status = 'open';`;

  await logAudit({
    outletId: guard.session.outletId,
    staffId: guard.session.staffId,
    action: "order_sent_to_kitchen",
    entityType: "order",
    entityId: Number(id),
    newValue: { item_count: pending.length },
  });

  const items = await sql`SELECT * FROM pos_order_items WHERE order_id = ${id} ORDER BY created_at;`;
  return NextResponse.json(items);
}
