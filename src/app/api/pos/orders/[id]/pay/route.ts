import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, logAudit } from "@/lib/pos/api-helpers";
import { money } from "@/lib/pos/types";

interface IncomingPayment {
  method: string;
  amount: number;
  amount_received?: number;
  reference?: string;
  room_number?: string;
  guest_name?: string;
}

// Accepts one or more payments in a single call — this is how split
// payment-across-methods and equal/by-item split billing both settle:
// the client just posts multiple {method, amount} entries (from
// potentially separate "checks") against this one order. Partial payment
// leaves the order 'billed' until paid_amount reaches total_amount.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("pos");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();
  const payments: IncomingPayment[] = Array.isArray(b.payments) ? b.payments : [];
  if (payments.length === 0) return NextResponse.json({ error: "At least one payment is required" }, { status: 400 });

  const orderRows = await sql`SELECT * FROM pos_orders WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  const order = orderRows[0];
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status === "paid" || order.status === "void") {
    return NextResponse.json({ error: `Order is already ${order.status}` }, { status: 400 });
  }

  let newlyPaid = 0;
  for (const p of payments) {
    if (!p.method || !p.amount) continue;
    await sql`
      INSERT INTO pos_payments (order_id, method, amount, amount_received, reference, room_number, guest_name, received_by)
      VALUES (${id}, ${p.method}, ${money(p.amount)}, ${p.amount_received ?? null}, ${p.reference ?? null}, ${p.room_number ?? null}, ${p.guest_name ?? null}, ${guard.session.staffId});
    `;
    newlyPaid += money(p.amount);
  }

  const paidAmount = money(Number(order.paid_amount) + newlyPaid);
  const isFullyPaid = paidAmount >= Number(order.total_amount) - 0.01;
  const nextStatus = isFullyPaid ? "paid" : "billed";

  await sql`
    UPDATE pos_orders SET paid_amount = ${paidAmount}, cashier_id = ${guard.session.staffId},
      status = ${nextStatus}, closed_at = ${isFullyPaid ? new Date().toISOString() : null}, updated_at = now()
    WHERE id = ${id};
  `;

  if (isFullyPaid) {
    await deductInventoryForOrder(Number(id), guard.session.outletId, guard.session.staffId);

    if (order.table_id) {
      const stillOpen = await sql`
        SELECT COUNT(*)::int AS count FROM pos_orders WHERE table_id = ${order.table_id} AND id != ${id} AND status NOT IN ('paid', 'void', 'cancelled');
      `;
      if (stillOpen[0].count === 0) await sql`UPDATE pos_tables SET status = 'cleaning' WHERE id = ${order.table_id};`;
    }

    if (order.customer_id) {
      const pointsEarned = Math.floor(Number(order.total_amount));
      await sql`UPDATE pos_customers SET loyalty_points = loyalty_points + ${pointsEarned} WHERE id = ${order.customer_id};`;
    }

    await logAudit({
      outletId: guard.session.outletId,
      staffId: guard.session.staffId,
      action: "order_paid",
      entityType: "order",
      entityId: Number(id),
      newValue: { total_amount: order.total_amount, methods: payments.map((p) => p.method) },
    });
  }

  const updatedOrder = await sql`SELECT * FROM pos_orders WHERE id = ${id};`;
  const allPayments = await sql`SELECT * FROM pos_payments WHERE order_id = ${id} ORDER BY created_at;`;
  return NextResponse.json({ ...updatedOrder[0], payments: allPayments });
}

async function deductInventoryForOrder(orderId: number, outletId: number, staffId: number) {
  const items = await sql`SELECT * FROM pos_order_items WHERE order_id = ${orderId} AND is_void = false AND menu_item_id IS NOT NULL;`;
  for (const item of items) {
    const recipe = await sql`SELECT * FROM pos_recipe_items WHERE menu_item_id = ${item.menu_item_id};`;
    for (const r of recipe) {
      const deduct = Number(r.quantity) * Number(item.quantity);
      await sql`UPDATE pos_ingredients SET stock_qty = stock_qty - ${deduct} WHERE id = ${r.ingredient_id};`;
      await sql`
        INSERT INTO pos_stock_movements (outlet_id, ingredient_id, type, quantity, reference, staff_id)
        VALUES (${outletId}, ${r.ingredient_id}, 'sale', ${-deduct}, ${"Order #" + orderId}, ${staffId});
      `;
    }
  }
}
