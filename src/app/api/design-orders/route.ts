import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM design_orders ORDER BY
    CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    due_date NULLS LAST, created_at DESC;`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const { client_name, description, priority, status, due_date } = await req.json();
  if (!client_name) {
    return NextResponse.json({ error: "client_name is required" }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO design_orders (client_name, description, priority, status, due_date)
    VALUES (${client_name}, ${description ?? null}, ${priority ?? "medium"}, ${status ?? "new"}, ${due_date ?? null})
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
