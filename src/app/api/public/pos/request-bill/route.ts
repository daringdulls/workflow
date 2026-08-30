import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema, getDefaultOutletId } from "@/lib/pos/db";

// Public write-only: guest taps "Request Bill" on the QR menu, which flips
// the table to 'waiting_bill' so it's highlighted on the staff Tables page.
export async function POST(req: NextRequest) {
  await ensurePosSchema();
  const { table_id } = await req.json();
  if (!table_id) return NextResponse.json({ error: "table_id is required" }, { status: 400 });
  const outletId = await getDefaultOutletId();
  await sql`UPDATE pos_tables SET status = 'waiting_bill' WHERE id = ${table_id} AND outlet_id = ${outletId};`;
  return NextResponse.json({ ok: true });
}
