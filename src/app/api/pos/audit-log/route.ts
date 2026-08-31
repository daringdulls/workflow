import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET() {
  const guard = await requireSession("settings");
  if ("error" in guard) return guard.error;
  const rows = await sql`
    SELECT a.*, s.name AS staff_name FROM pos_audit_log a
    LEFT JOIN pos_staff s ON s.id = a.staff_id
    WHERE a.outlet_id = ${guard.session.outletId}
    ORDER BY a.created_at DESC
    LIMIT 300;
  `;
  return NextResponse.json(rows);
}
