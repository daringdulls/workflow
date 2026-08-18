import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const id = Number(params.id);
  await sql`DELETE FROM events WHERE id = ${id};`;
  return NextResponse.json({ ok: true });
}
