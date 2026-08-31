import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("menu");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const { name, sort_order } = await req.json();
  const rows = await sql`
    UPDATE pos_categories SET
      name = COALESCE(${name ?? null}, name),
      sort_order = COALESCE(${sort_order ?? null}, sort_order)
    WHERE id = ${id} AND outlet_id = ${guard.session.outletId}
    RETURNING *;
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("menu");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  await sql`DELETE FROM pos_categories WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  return NextResponse.json({ ok: true });
}
