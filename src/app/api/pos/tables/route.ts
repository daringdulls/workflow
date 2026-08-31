import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET() {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const rows = await sql`
    SELECT t.*, a.name AS area_name,
      o.id AS order_id, o.order_number, o.total_amount AS order_total, o.guest_count AS order_guest_count,
      o.created_at AS order_started_at, w.name AS waiter_name
    FROM pos_tables t
    LEFT JOIN pos_dining_areas a ON a.id = t.area_id
    LEFT JOIN LATERAL (
      SELECT * FROM pos_orders
      WHERE table_id = t.id AND status NOT IN ('paid', 'void', 'cancelled')
      ORDER BY created_at DESC LIMIT 1
    ) o ON true
    LEFT JOIN pos_staff w ON w.id = o.waiter_id
    WHERE t.outlet_id = ${guard.session.outletId}
    ORDER BY a.sort_order NULLS LAST, t.name;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("tables");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const rows = await sql`
    INSERT INTO pos_tables (outlet_id, area_id, name, capacity, pos_x, pos_y, status)
    VALUES (${guard.session.outletId}, ${b.area_id ?? null}, ${b.name}, ${b.capacity ?? 4}, ${b.pos_x ?? 20}, ${b.pos_y ?? 20}, ${b.status ?? "available"})
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
