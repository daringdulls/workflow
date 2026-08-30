import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET() {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  const rows = await sql`
    SELECT * FROM pos_shifts WHERE staff_id = ${guard.session.staffId} AND status = 'open' ORDER BY opened_at DESC LIMIT 1;
  `;
  if (rows.length === 0) return NextResponse.json(null);

  const shift = rows[0];
  const summary = await sql`
    SELECT method, COALESCE(SUM(amount), 0) AS total
    FROM pos_payments
    WHERE received_by = ${guard.session.staffId} AND created_at >= ${shift.opened_at} AND is_refund = false
    GROUP BY method;
  `;
  return NextResponse.json({ ...shift, payment_summary: summary });
}
