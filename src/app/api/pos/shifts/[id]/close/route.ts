import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, logAudit } from "@/lib/pos/api-helpers";
import { money } from "@/lib/pos/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("shifts");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();

  const shiftRows = await sql`SELECT * FROM pos_shifts WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  const shift = shiftRows[0];
  if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (shift.status === "closed") return NextResponse.json({ error: "Already closed" }, { status: 400 });

  const cashRows = await sql`
    SELECT COALESCE(SUM(amount), 0) AS total FROM pos_payments
    WHERE received_by = ${shift.staff_id} AND method = 'cash' AND created_at >= ${shift.opened_at} AND is_refund = false;
  `;
  const cashTaken = money(cashRows[0].total);
  const expected = money(Number(shift.opening_cash) + cashTaken);
  const actual = money(b.closing_cash_actual ?? expected);
  const difference = money(actual - expected);

  const rows = await sql`
    UPDATE pos_shifts SET
      closing_cash_expected = ${expected},
      closing_cash_actual = ${actual},
      cash_difference = ${difference},
      status = 'closed',
      notes = ${b.notes ?? null},
      closed_at = now()
    WHERE id = ${id}
    RETURNING *;
  `;

  await logAudit({
    outletId: guard.session.outletId,
    staffId: guard.session.staffId,
    action: "shift_closed",
    entityType: "shift",
    entityId: Number(id),
    newValue: { expected, actual, difference },
  });

  return NextResponse.json(rows[0]);
}
