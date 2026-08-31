import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession } from "@/lib/pos/api-helpers";
import { money } from "@/lib/pos/types";

export async function GET() {
  const guard = await requireSession("purchasing");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const rows = await sql`
    SELECT po.*, s.name AS supplier_name
    FROM pos_purchase_orders po
    LEFT JOIN pos_suppliers s ON s.id = po.supplier_id
    WHERE po.outlet_id = ${guard.session.outletId}
    ORDER BY po.order_date DESC, po.id DESC;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("purchasing");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const b = await req.json();
  const items: Array<{ ingredient_id?: number; description: string; quantity: number; unit_cost: number }> = Array.isArray(b.items) ? b.items : [];
  const total = money(items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost), 0));

  const poRows = await sql`
    INSERT INTO pos_purchase_orders (outlet_id, supplier_id, status, order_date, expected_date, invoice_number, total_amount, tax_amount, due_date, created_by)
    VALUES (${guard.session.outletId}, ${b.supplier_id ?? null}, ${b.status ?? "pending"}, ${b.order_date ?? new Date().toISOString().slice(0, 10)}, ${b.expected_date ?? null}, ${b.invoice_number ?? null}, ${total}, ${b.tax_amount ?? 0}, ${b.due_date ?? null}, ${guard.session.staffId})
    RETURNING *;
  `;
  const po = poRows[0];

  const savedItems = [];
  for (const item of items) {
    if (!item.description) continue;
    const rows = await sql`
      INSERT INTO pos_purchase_order_items (po_id, ingredient_id, description, quantity, unit_cost, total)
      VALUES (${po.id}, ${item.ingredient_id ?? null}, ${item.description}, ${item.quantity}, ${item.unit_cost}, ${money(item.quantity * item.unit_cost)})
      RETURNING *;
    `;
    savedItems.push(rows[0]);
  }

  return NextResponse.json({ ...po, items: savedItems }, { status: 201 });
}
