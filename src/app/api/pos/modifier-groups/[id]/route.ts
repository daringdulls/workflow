import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("menu");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();

  const existingRows = await sql`SELECT * FROM pos_modifier_groups WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  if (existingRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const existing = existingRows[0];

  await sql`
    UPDATE pos_modifier_groups SET
      name = ${b.name ?? existing.name},
      min_select = ${b.min_select ?? existing.min_select},
      max_select = ${b.max_select ?? existing.max_select},
      required = ${b.required ?? existing.required}
    WHERE id = ${id};
  `;

  if (Array.isArray(b.options)) {
    await sql`DELETE FROM pos_modifier_options WHERE group_id = ${id};`;
    for (let i = 0; i < b.options.length; i++) {
      const opt = b.options[i];
      if (!opt.name) continue;
      await sql`
        INSERT INTO pos_modifier_options (group_id, name, price_delta, sort_order)
        VALUES (${id}, ${opt.name}, ${opt.price_delta ?? 0}, ${i});
      `;
    }
  }

  const groupRows = await sql`SELECT * FROM pos_modifier_groups WHERE id = ${id};`;
  const optionRows = await sql`SELECT * FROM pos_modifier_options WHERE group_id = ${id} ORDER BY sort_order;`;
  return NextResponse.json({ ...groupRows[0], options: optionRows });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("menu");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  await sql`DELETE FROM pos_modifier_groups WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  return NextResponse.json({ ok: true });
}
