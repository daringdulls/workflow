import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, logAudit } from "@/lib/pos/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("tables");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();

  const existingRows = await sql`SELECT * FROM pos_tables WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  if (existingRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const existing = existingRows[0];

  const rows = await sql`
    UPDATE pos_tables SET
      area_id = ${b.area_id !== undefined ? b.area_id : existing.area_id},
      name = ${b.name ?? existing.name},
      capacity = ${b.capacity ?? existing.capacity},
      pos_x = ${b.pos_x ?? existing.pos_x},
      pos_y = ${b.pos_y ?? existing.pos_y},
      status = ${b.status ?? existing.status}
    WHERE id = ${id}
    RETURNING *;
  `;

  if (b.status && b.status !== existing.status) {
    await logAudit({
      outletId: guard.session.outletId,
      staffId: guard.session.staffId,
      action: "table_status_change",
      entityType: "table",
      entityId: Number(id),
      oldValue: { status: existing.status },
      newValue: { status: b.status },
    });
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("tables");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  await sql`DELETE FROM pos_tables WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  return NextResponse.json({ ok: true });
}
