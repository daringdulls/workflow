import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, verifyManagerAuth, logAudit } from "@/lib/pos/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("pos");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();

  const orderRows = await sql`SELECT * FROM pos_orders WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  const order = orderRows[0];
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ error: "Cannot void a paid order — issue a refund instead" }, { status: 400 });

  const auth = await verifyManagerAuth(guard.session.outletId, b.authorized_by, b.authorization_pin, "voidsRefunds");
  if (!auth.ok) return auth.error;

  const updated = await sql`
    UPDATE pos_orders SET status = 'void', notes = COALESCE(notes || E'\\n', '') || ${"Voided: " + (b.reason ?? "no reason given")}, updated_at = now()
    WHERE id = ${id}
    RETURNING *;
  `;

  if (order.table_id) {
    const stillOpen = await sql`
      SELECT COUNT(*)::int AS count FROM pos_orders WHERE table_id = ${order.table_id} AND id != ${id} AND status NOT IN ('paid', 'void', 'cancelled');
    `;
    if (stillOpen[0].count === 0) await sql`UPDATE pos_tables SET status = 'available' WHERE id = ${order.table_id};`;
  }

  await logAudit({
    outletId: guard.session.outletId,
    staffId: guard.session.staffId,
    action: "order_void",
    entityType: "order",
    entityId: Number(id),
    oldValue: { total_amount: order.total_amount },
    reason: b.reason ?? null,
    newValue: { approved_by: auth.approverName },
  });

  return NextResponse.json(updated[0]);
}
