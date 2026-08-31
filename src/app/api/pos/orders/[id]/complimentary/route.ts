import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, verifyManagerAuth, logAudit } from "@/lib/pos/api-helpers";
import { recomputeOrder } from "@/lib/pos/order-calc";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("pos");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();

  const orderRows = await sql`SELECT * FROM pos_orders WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  const order = orderRows[0];
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auth = await verifyManagerAuth(guard.session.outletId, b.authorized_by, b.authorization_pin, "voidsRefunds");
  if (!auth.ok) return auth.error;

  await sql`UPDATE pos_orders SET is_complimentary = true, updated_at = now() WHERE id = ${id};`;

  await logAudit({
    outletId: guard.session.outletId,
    staffId: guard.session.staffId,
    action: "order_complimentary",
    entityType: "order",
    entityId: Number(id),
    oldValue: { total_amount: order.total_amount },
    reason: b.reason ?? null,
    newValue: { approved_by: auth.approverName },
  });

  const updated = await recomputeOrder(Number(id));
  return NextResponse.json(updated);
}
