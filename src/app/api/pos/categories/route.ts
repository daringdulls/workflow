import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET() {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const rows = await sql`
    SELECT * FROM pos_categories WHERE outlet_id = ${guard.session.outletId} ORDER BY sort_order, name;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("menu");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const { name, sort_order } = await req.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const rows = await sql`
    INSERT INTO pos_categories (outlet_id, name, sort_order)
    VALUES (${guard.session.outletId}, ${name}, ${sort_order ?? 0})
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
