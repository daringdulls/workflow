import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM freelance_projects ORDER BY
    CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    deadline NULLS LAST, created_at DESC;`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const { client_name, project_name, description, priority, status, deadline, rate } = await req.json();
  if (!client_name || !project_name) {
    return NextResponse.json({ error: "client_name and project_name are required" }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO freelance_projects (client_name, project_name, description, priority, status, deadline, rate)
    VALUES (${client_name}, ${project_name}, ${description ?? null}, ${priority ?? "medium"}, ${status ?? "lead"}, ${deadline ?? null}, ${rate ?? null})
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
