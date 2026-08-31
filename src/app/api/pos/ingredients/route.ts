import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET() {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const rows = await sql`
    SELECT * FROM pos_ingredients WHERE outlet_id = ${guard.session.outletId} ORDER BY name;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("inventory");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const rows = await sql`
    INSERT INTO pos_ingredients (outlet_id, name, unit, stock_qty, reorder_level, cost_per_unit, supplier_id, expiry_date, batch_number)
    VALUES (
      ${guard.session.outletId}, ${b.name}, ${b.unit ?? "g"}, ${b.stock_qty ?? 0}, ${b.reorder_level ?? 0},
      ${b.cost_per_unit ?? 0}, ${b.supplier_id ?? null}, ${b.expiry_date ?? null}, ${b.batch_number ?? null}
    )
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
