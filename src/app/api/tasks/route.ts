import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM tasks ORDER BY
    CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    due_date NULLS LAST, created_at DESC;`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const body = await req.json();
  const { profile, title, notes, due_date, priority, status } = body;
  if (!profile || !title) {
    return NextResponse.json({ error: "profile and title are required" }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO tasks (profile, title, notes, due_date, priority, status)
    VALUES (${profile}, ${title}, ${notes ?? null}, ${due_date ?? null}, ${priority ?? "medium"}, ${status ?? "todo"})
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
