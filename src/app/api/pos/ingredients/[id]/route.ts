import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, logAudit } from "@/lib/pos/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("inventory");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();

  const existingRows = await sql`SELECT * FROM pos_ingredients WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  if (existingRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const existing = existingRows[0];

  const rows = await sql`
    UPDATE pos_ingredients SET
      name = ${b.name ?? existing.name},
      unit = ${b.unit ?? existing.unit},
      stock_qty = ${b.stock_qty ?? existing.stock_qty},
      reorder_level = ${b.reorder_level ?? existing.reorder_level},
      cost_per_unit = ${b.cost_per_unit ?? existing.cost_per_unit},
      supplier_id = ${b.supplier_id !== undefined ? b.supplier_id : existing.supplier_id},
      expiry_date = ${b.expiry_date !== undefined ? b.expiry_date : existing.expiry_date},
      batch_number = ${b.batch_number !== undefined ? b.batch_number : existing.batch_number}
    WHERE id = ${id}
    RETURNING *;
  `;

  if (b.stock_qty !== undefined && Number(b.stock_qty) !== Number(existing.stock_qty)) {
    await logAudit({
      outletId: guard.session.outletId,
      staffId: guard.session.staffId,
      action: "stock_adjustment",
      entityType: "ingredient",
      entityId: Number(id),
      oldValue: { stock_qty: existing.stock_qty },
      newValue: { stock_qty: b.stock_qty },
      reason: b.adjustment_reason ?? null,
    });
    await sql`
      INSERT INTO pos_stock_movements (outlet_id, ingredient_id, type, quantity, staff_id, reason)
      VALUES (${guard.session.outletId}, ${id}, 'adjustment', ${Number(b.stock_qty) - Number(existing.stock_qty)}, ${guard.session.staffId}, ${b.adjustment_reason ?? "Manual adjustment"});
    `;
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("inventory");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  await sql`DELETE FROM pos_ingredients WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  return NextResponse.json({ ok: true });
}
