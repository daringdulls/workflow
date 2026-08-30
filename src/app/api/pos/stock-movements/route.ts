import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession, verifyManagerAuth, logAudit } from "@/lib/pos/api-helpers";

export async function GET(req: NextRequest) {
  const guard = await requireSession("inventory");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const rows = await sql`
    SELECT m.*, i.name AS ingredient_name, i.unit, s.name AS staff_name
    FROM pos_stock_movements m
    JOIN pos_ingredients i ON i.id = m.ingredient_id
    LEFT JOIN pos_staff s ON s.id = m.staff_id
    WHERE m.outlet_id = ${guard.session.outletId}
      AND (${type}::text IS NULL OR m.type = ${type})
    ORDER BY m.created_at DESC
    LIMIT 200;
  `;
  return NextResponse.json(rows);
}

// Records wastage / manual issue / adjustment movements directly (as
// opposed to the automatic 'sale' deduction that happens on payment).
// Wastage of any real value needs manager approval, per the spec.
export async function POST(req: NextRequest) {
  const guard = await requireSession("inventory");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const b = await req.json();
  if (!b.ingredient_id || !b.type || b.quantity == null) {
    return NextResponse.json({ error: "ingredient_id, type and quantity are required" }, { status: 400 });
  }

  const ingredientRows = await sql`SELECT * FROM pos_ingredients WHERE id = ${b.ingredient_id} AND outlet_id = ${guard.session.outletId};`;
  const ingredient = ingredientRows[0];
  if (!ingredient) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });

  const signedQty = b.type === "purchase" ? Math.abs(b.quantity) : -Math.abs(b.quantity);
  const estimatedCost = Math.abs(signedQty) * Number(ingredient.cost_per_unit);

  let approverName: string | null = null;
  if (b.type === "waste" && estimatedCost > 5) {
    const auth = await verifyManagerAuth(guard.session.outletId, b.approved_by, b.approval_pin, "voidsRefunds");
    if (!auth.ok) return auth.error;
    approverName = auth.approverName;
  }

  await sql`UPDATE pos_ingredients SET stock_qty = stock_qty + ${signedQty} WHERE id = ${b.ingredient_id};`;
  const rows = await sql`
    INSERT INTO pos_stock_movements (outlet_id, ingredient_id, type, quantity, unit_cost, reference, reason, department, staff_id)
    VALUES (${guard.session.outletId}, ${b.ingredient_id}, ${b.type}, ${signedQty}, ${ingredient.cost_per_unit}, ${b.reference ?? null}, ${b.reason ?? null}, ${b.department ?? null}, ${guard.session.staffId})
    RETURNING *;
  `;

  await logAudit({
    outletId: guard.session.outletId,
    staffId: guard.session.staffId,
    action: `stock_${b.type}`,
    entityType: "ingredient",
    entityId: b.ingredient_id,
    newValue: { quantity: signedQty, approved_by: approverName },
    reason: b.reason ?? null,
  });

  return NextResponse.json(rows[0], { status: 201 });
}
