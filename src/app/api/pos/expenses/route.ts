import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET(req: NextRequest) {
  const guard = await requireSession("expenses");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const rows = await sql`
    SELECT e.*, s.name AS supplier_name FROM pos_expenses e
    LEFT JOIN pos_suppliers s ON s.id = e.supplier_id
    WHERE e.outlet_id = ${guard.session.outletId}
      AND (${from}::date IS NULL OR e.expense_date >= ${from}::date)
      AND (${to}::date IS NULL OR e.expense_date <= ${to}::date)
    ORDER BY e.expense_date DESC, e.id DESC;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("expenses");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const b = await req.json();
  if (!b.category || !b.amount) return NextResponse.json({ error: "category and amount are required" }, { status: 400 });
  const rows = await sql`
    INSERT INTO pos_expenses (outlet_id, category, amount, payment_method, supplier_id, description, receipt_url, entered_by, expense_date)
    VALUES (
      ${guard.session.outletId}, ${b.category}, ${b.amount}, ${b.payment_method ?? "cash"}, ${b.supplier_id ?? null},
      ${b.description ?? null}, ${b.receipt_url ?? null}, ${guard.session.staffId}, ${b.expense_date ?? new Date().toISOString().slice(0, 10)}
    )
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
