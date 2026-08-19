import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM events ORDER BY date, time NULLS LAST;`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const { profile, title, date, time, notes, remind_at } = await req.json();
  if (!profile || !title || !date) {
    return NextResponse.json({ error: "profile, title and date are required" }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO events (profile, title, date, time, notes, remind_at)
    VALUES (${profile}, ${title}, ${date}, ${time ?? null}, ${notes ?? null}, ${remind_at ?? null})
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
