import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, verifyManagerAuth, logAudit } from "@/lib/pos/api-helpers";
import { recomputeOrder } from "@/lib/pos/order-calc";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const guard = await requireSession("pos");
  if ("error" in guard) return guard.error;
  const { id, itemId } = await params;
  const b = await req.json();

  const rows = await sql`SELECT oi.* FROM pos_order_items oi JOIN pos_orders o ON o.id = oi.order_id WHERE oi.id = ${itemId} AND oi.order_id = ${id} AND o.outlet_id = ${guard.session.outletId};`;
  const existing = rows[0];
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Voiding an item after it has been sent to the kitchen, or marking it
  // complimentary, needs manager sign-off — matches the "void with
  // authorization" and "complimentary items" requirements.
  const needsAuth = (b.is_void && existing.sent_at) || (b.is_complimentary && !existing.is_complimentary);
  if (needsAuth) {
    const auth = await verifyManagerAuth(guard.session.outletId, b.authorized_by, b.authorization_pin, "voidsRefunds");
    if (!auth.ok) return auth.error;
    await logAudit({
      outletId: guard.session.outletId,
      staffId: guard.session.staffId,
      action: b.is_void ? "item_void" : "item_complimentary",
      entityType: "order_item",
      entityId: Number(itemId),
      oldValue: { quantity: existing.quantity, unit_price: existing.unit_price },
      reason: b.void_reason ?? b.reason ?? null,
    });
  }

  const updated = await sql`
    UPDATE pos_order_items SET
      quantity = ${b.quantity ?? existing.quantity},
      notes = ${b.notes !== undefined ? b.notes : existing.notes},
      kitchen_notes = ${b.kitchen_notes !== undefined ? b.kitchen_notes : existing.kitchen_notes},
      status = ${b.status ?? existing.status},
      is_complimentary = ${b.is_complimentary ?? existing.is_complimentary},
      is_void = ${b.is_void ?? existing.is_void},
      void_reason = ${b.void_reason !== undefined ? b.void_reason : existing.void_reason},
      ready_at = ${b.status === "ready" ? new Date().toISOString() : existing.ready_at},
      served_at = ${b.status === "served" ? new Date().toISOString() : existing.served_at}
    WHERE id = ${itemId}
    RETURNING *;
  `;

  await recomputeOrder(Number(id));
  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const guard = await requireSession("pos");
  if ("error" in guard) return guard.error;
  const { id, itemId } = await params;

  const rows = await sql`SELECT * FROM pos_order_items WHERE id = ${itemId} AND order_id = ${id};`;
  const existing = rows[0];
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.sent_at) {
    return NextResponse.json({ error: "This item was already sent to the kitchen — void it instead of deleting." }, { status: 400 });
  }

  await sql`DELETE FROM pos_order_items WHERE id = ${itemId};`;
  await recomputeOrder(Number(id));
  return NextResponse.json({ ok: true });
}
