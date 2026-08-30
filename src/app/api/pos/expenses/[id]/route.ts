import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("expenses");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();
  const existingRows = await sql`SELECT * FROM pos_expenses WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  const existing = existingRows[0];
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await sql`
    UPDATE pos_expenses SET
      category = ${b.category ?? existing.category},
      amount = ${b.amount ?? existing.amount},
      payment_method = ${b.payment_method ?? existing.payment_method},
      supplier_id = ${b.supplier_id !== undefined ? b.supplier_id : existing.supplier_id},
      description = ${b.description !== undefined ? b.description : existing.description},
      approved_by = ${b.approved_by !== undefined ? b.approved_by : existing.approved_by},
      expense_date = ${b.expense_date ?? existing.expense_date}
    WHERE id = ${id}
    RETURNING *;
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("expenses");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  await sql`DELETE FROM pos_expenses WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  return NextResponse.json({ ok: true });
}
