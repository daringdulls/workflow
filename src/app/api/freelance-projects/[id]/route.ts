import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const id = Number(params.id);
  const body = await req.json();
  const fields = ["client_name", "project_name", "description", "priority", "status", "deadline", "rate"] as const;
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
  const query = `UPDATE freelance_projects SET ${updates.join(", ")} WHERE id = $${i} RETURNING *;`;
  const rows = await sql.query(query, values);
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const id = Number(params.id);
  await sql`DELETE FROM freelance_projects WHERE id = ${id};`;
  return NextResponse.json({ ok: true });
}
