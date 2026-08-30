import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("purchasing");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const poRows = await sql`
    SELECT po.*, s.name AS supplier_name FROM pos_purchase_orders po
    LEFT JOIN pos_suppliers s ON s.id = po.supplier_id
    WHERE po.id = ${id} AND po.outlet_id = ${guard.session.outletId};
  `;
  if (poRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const items = await sql`SELECT * FROM pos_purchase_order_items WHERE po_id = ${id};`;
  return NextResponse.json({ ...poRows[0], items });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("purchasing");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();
  const existingRows = await sql`SELECT * FROM pos_purchase_orders WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  const existing = existingRows[0];
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await sql`
    UPDATE pos_purchase_orders SET
      status = ${b.status ?? existing.status},
      payment_status = ${b.payment_status ?? existing.payment_status},
      invoice_number = ${b.invoice_number !== undefined ? b.invoice_number : existing.invoice_number},
      due_date = ${b.due_date !== undefined ? b.due_date : existing.due_date}
    WHERE id = ${id}
    RETURNING *;
  `;
  return NextResponse.json(rows[0]);
}
