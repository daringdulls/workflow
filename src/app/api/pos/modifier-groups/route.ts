import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET() {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const groups = await sql`
    SELECT * FROM pos_modifier_groups WHERE outlet_id = ${guard.session.outletId} ORDER BY name;
  `;
  const options = await sql`
    SELECT o.* FROM pos_modifier_options o
    JOIN pos_modifier_groups g ON g.id = o.group_id
    WHERE g.outlet_id = ${guard.session.outletId}
    ORDER BY o.sort_order, o.name;
  `;
  const result = groups.map((g) => ({
    ...g,
    options: options.filter((o) => o.group_id === g.id),
  }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("menu");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const rows = await sql`
    INSERT INTO pos_modifier_groups (outlet_id, name, min_select, max_select, required)
    VALUES (${guard.session.outletId}, ${b.name}, ${b.min_select ?? 0}, ${b.max_select ?? 1}, ${b.required ?? false})
    RETURNING *;
  `;
  const group = rows[0];

  const options: unknown[] = Array.isArray(b.options) ? b.options : [];
  const savedOptions = [];
  for (let i = 0; i < options.length; i++) {
    const opt = options[i] as { name: string; price_delta?: number };
    if (!opt.name) continue;
    const optRows = await sql`
      INSERT INTO pos_modifier_options (group_id, name, price_delta, sort_order)
      VALUES (${group.id}, ${opt.name}, ${opt.price_delta ?? 0}, ${i})
      RETURNING *;
    `;
    savedOptions.push(optRows[0]);
  }

  return NextResponse.json({ ...group, options: savedOptions }, { status: 201 });
}
