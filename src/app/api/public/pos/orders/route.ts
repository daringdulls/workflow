import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema, getDefaultOutletId } from "@/lib/pos/db";
import { recomputeOrder } from "@/lib/pos/order-calc";

// Public write-only endpoint for QR ordering: it can only create a new
// dine-in order (tied to the scanned table) with items priced straight from
// the current menu — no read/update/delete access to anything else, and no
// staff session required. The order lands with items unsent to the kitchen
// so a waiter/cashier reviews it in the POS before it's fired — this is the
// "QR orders enter the POS automatically" requirement, kept safe.
export async function POST(req: NextRequest) {
  await ensurePosSchema();
  const b = await req.json();
  const outletId = await getDefaultOutletId();

  if (!b.table_id || !Array.isArray(b.items) || b.items.length === 0) {
    return NextResponse.json({ error: "table_id and at least one item are required" }, { status: 400 });
  }

  const tableRows = await sql`SELECT * FROM pos_tables WHERE id = ${b.table_id} AND outlet_id = ${outletId};`;
  if (tableRows.length === 0) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  const outletRows = await sql`SELECT order_number_prefix FROM pos_outlets WHERE id = ${outletId};`;
  const prefix = outletRows[0].order_number_prefix as string;

  const existingOpen = await sql`
    SELECT id FROM pos_orders WHERE table_id = ${b.table_id} AND status NOT IN ('paid', 'void', 'cancelled') ORDER BY created_at DESC LIMIT 1;
  `;

  let orderId: number;
  if (existingOpen.length > 0) {
    orderId = existingOpen[0].id as number;
  } else {
    const inserted = await sql`
      INSERT INTO pos_orders (outlet_id, order_number, order_type, table_id, guest_count, source, notes)
      VALUES (${outletId}, '', 'dine_in', ${b.table_id}, ${b.guest_count ?? 2}, 'qr', 'Placed via QR ordering — review before sending to kitchen')
      RETURNING *;
    `;
    orderId = inserted[0].id as number;
    await sql`UPDATE pos_orders SET order_number = ${prefix + "-" + String(orderId).padStart(5, "0")} WHERE id = ${orderId};`;
    await sql`UPDATE pos_tables SET status = 'occupied' WHERE id = ${b.table_id} AND status = 'available';`;
  }

  for (const line of b.items) {
    if (!line.menu_item_id || !line.quantity) continue;
    const itemRows = await sql`SELECT * FROM pos_menu_items WHERE id = ${line.menu_item_id} AND outlet_id = ${outletId} AND is_available = true;`;
    const menuItem = itemRows[0];
    if (!menuItem) continue;
    const modifiers = Array.isArray(line.modifiers) ? line.modifiers.slice(0, 10) : [];
    await sql`
      INSERT INTO pos_order_items (order_id, menu_item_id, name_snapshot, quantity, unit_price, modifiers, notes, station)
      VALUES (${orderId}, ${menuItem.id}, ${menuItem.name}, ${Math.min(Number(line.quantity), 20)}, ${menuItem.price}, ${JSON.stringify(modifiers)}, ${line.notes ?? null}, ${menuItem.station});
    `;
  }

  await recomputeOrder(orderId);
  return NextResponse.json({ ok: true, order_id: orderId }, { status: 201 });
}
