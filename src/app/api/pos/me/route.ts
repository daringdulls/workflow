import { NextResponse } from "next/server";
import { getPosSession, permissionsFor } from "@/lib/pos/auth";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";

export async function GET() {
  const session = await getPosSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensurePosSchema();
  const outletRows = await sql`SELECT * FROM pos_outlets WHERE id = ${session.outletId} LIMIT 1;`;
  const shiftRows = await sql`
    SELECT * FROM pos_shifts WHERE staff_id = ${session.staffId} AND status = 'open' ORDER BY opened_at DESC LIMIT 1;
  `;

  return NextResponse.json({
    staff: session,
    permissions: permissionsFor(session.role),
    outlet: outletRows[0] ?? null,
    openShift: shiftRows[0] ?? null,
  });
}
