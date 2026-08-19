import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const id = Number(params.id);
  const body = await req.json();
  const fields = [
    "order_name",
    "order_type",
    "design_type",
    "client_name",
    "contact",
    "sponsor",
    "sponsor_logo_url",
    "description",
    "logo_url",
    "priority",
    "status",
    "requested_date",
    "due_date",
    "needs_shorts",
    "needs_tracksuit",
    "needs_skirt",
    "number_front",
    "number_back",
    "number_shorts",
    "neck_type",
    "sleeve_type",
    "reference_notes",
  ] as const;
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const f of fields) {
    if (f in body) {
      updates.push(`${f} = $${i}`);
      values.push(body[f]);
      i++;
    }
  }
  if (updates.length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }
  values.push(id);
  const query = `UPDATE design_orders SET ${updates.join(", ")} WHERE id = $${i} RETURNING *;`;
  const rows = await sql.query(query, values);
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const id = Number(params.id);
  await sql`DELETE FROM design_orders WHERE id = ${id};`;
  return NextResponse.json({ ok: true });
}
