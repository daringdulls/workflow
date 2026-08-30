import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET() {
  const guard = await requireSession("shifts");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const rows = await sql`
    SELECT s.*, st.name AS staff_name FROM pos_shifts s
    JOIN pos_staff st ON st.id = s.staff_id
    WHERE s.outlet_id = ${guard.session.outletId}
    ORDER BY s.opened_at DESC
    LIMIT 100;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("shifts");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const b = await req.json();

  const openRows = await sql`SELECT id FROM pos_shifts WHERE staff_id = ${guard.session.staffId} AND status = 'open';`;
  if (openRows.length > 0) return NextResponse.json({ error: "You already have an open shift" }, { status: 400 });

  const rows = await sql`
    INSERT INTO pos_shifts (outlet_id, staff_id, terminal, opening_cash)
    VALUES (${guard.session.outletId}, ${guard.session.staffId}, ${b.terminal ?? "Terminal 1"}, ${b.opening_cash ?? 0})
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
