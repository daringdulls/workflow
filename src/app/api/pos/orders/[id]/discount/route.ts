import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, verifyManagerAuth, logAudit } from "@/lib/pos/api-helpers";
import { recomputeOrder } from "@/lib/pos/order-calc";
import { money } from "@/lib/pos/types";

// type: 'percent' | 'fixed'. Discounts above the outlet's configured
// discount_auth_limit require a manager's staffId + PIN, matching the
// "manager authorization above a configurable limit" requirement.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("pos");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();

  const orderRows = await sql`SELECT * FROM pos_orders WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  const order = orderRows[0];
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const amount = money(b.type === "percent" ? Number(order.subtotal) * (Number(b.value) / 100) : Number(b.value));

  const outletRows = await sql`SELECT discount_auth_limit FROM pos_outlets WHERE id = ${guard.session.outletId};`;
  const limit = Number(outletRows[0].discount_auth_limit);

  let approverName: string | null = null;
  if (amount > limit) {
    const auth = await verifyManagerAuth(guard.session.outletId, b.authorized_by, b.authorization_pin, "discounts");
    if (!auth.ok) return auth.error;
    approverName = auth.approverName;
  }

  await sql`
    UPDATE pos_orders SET discount_amount = ${amount}, discount_reason = ${b.reason ?? null}, updated_at = now()
    WHERE id = ${id};
  `;

  await logAudit({
    outletId: guard.session.outletId,
    staffId: guard.session.staffId,
    action: "discount_applied",
    entityType: "order",
    entityId: Number(id),
    oldValue: { discount_amount: order.discount_amount },
    newValue: { discount_amount: amount, approved_by: approverName },
    reason: b.reason ?? null,
  });

  const updated = await recomputeOrder(Number(id));
  return NextResponse.json(updated);
}
