import { sql } from "@/lib/db";
import { money } from "./types";

// Recomputes subtotal/tax/service-charge/total for an order from its live
// item rows, then persists the totals. Called after any change that can
// move the bill: adding/editing/voiding an item, applying a discount, or
// toggling complimentary. Kept in one place so every mutation route stays
// consistent instead of re-deriving the math per-route.
export async function recomputeOrder(orderId: number) {
  const orderRows = await sql`SELECT * FROM pos_orders WHERE id = ${orderId};`;
  const order = orderRows[0];
  if (!order) return null;

  const outletRows = await sql`SELECT tax_percent, service_charge_percent FROM pos_outlets WHERE id = ${order.outlet_id};`;
  const outlet = outletRows[0];

  const items = await sql`SELECT * FROM pos_order_items WHERE order_id = ${orderId} AND is_void = false;`;

  let subtotal = 0;
  for (const item of items) {
    if (item.is_complimentary) continue;
    const modifiers = Array.isArray(item.modifiers) ? item.modifiers : [];
    const modTotal = modifiers.reduce((sum: number, m: { price_delta?: number }) => sum + Number(m.price_delta ?? 0), 0);
    subtotal += (Number(item.unit_price) + modTotal) * Number(item.quantity);
  }
  subtotal = money(subtotal);

  const discount = money(order.discount_amount);
  const taxable = Math.max(0, subtotal - discount);
  const serviceChargeAmount = order.is_complimentary ? 0 : money(taxable * (Number(outlet.service_charge_percent) / 100));
  const taxAmount = order.is_complimentary ? 0 : money(taxable * (Number(outlet.tax_percent) / 100));
  const tip = money(order.tip_amount);
  const deliveryFee = money(order.delivery_fee);
  const total = order.is_complimentary ? 0 : money(taxable + serviceChargeAmount + taxAmount + tip + deliveryFee);

  const updated = await sql`
    UPDATE pos_orders SET
      subtotal = ${subtotal},
      service_charge_amount = ${serviceChargeAmount},
      tax_amount = ${taxAmount},
      total_amount = ${total},
      updated_at = now()
    WHERE id = ${orderId}
    RETURNING *;
  `;
  return updated[0];
}

export function lineTotal(item: { unit_price: number | string; quantity: number | string; modifiers: unknown; is_complimentary: boolean }) {
  if (item.is_complimentary) return 0;
  const modifiers = Array.isArray(item.modifiers) ? item.modifiers : [];
  const modTotal = modifiers.reduce((sum: number, m: { price_delta?: number }) => sum + Number(m.price_delta ?? 0), 0);
  return money((Number(item.unit_price) + modTotal) * Number(item.quantity));
}
