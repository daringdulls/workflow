import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

// Every not-yet-served ticket, across all stations — the KDS page groups
// these client-side by `station`.
export async function GET() {
  const guard = await requireSession("kitchen");
  if ("error" in guard) return guard.error;

  const rows = await sql`
    SELECT oi.*, o.order_number, o.order_type, o.table_id, t.name AS table_name
    FROM pos_order_items oi
    JOIN pos_orders o ON o.id = oi.order_id
    LEFT JOIN pos_tables t ON t.id = o.table_id
    WHERE o.outlet_id = ${guard.session.outletId}
      AND oi.is_void = false
      AND oi.sent_at IS NOT NULL
      AND oi.status NOT IN ('served', 'cancelled')
    ORDER BY oi.sent_at ASC;
  `;
  return NextResponse.json(rows);
}
