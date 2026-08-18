import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM links ORDER BY profile, sort_order, id;`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const { profile, label, url, emoji, sort_order } = await req.json();
  if (!profile || !label || !url) {
    return NextResponse.json({ error: "profile, label and url are required" }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO links (profile, label, url, emoji, sort_order)
    VALUES (${profile}, ${label}, ${url}, ${emoji ?? "🔗"}, ${sort_order ?? 0})
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
