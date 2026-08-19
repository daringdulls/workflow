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
  const {
    order_name,
    order_type,
    design_type,
    client_name,
    contact,
    sponsor,
    sponsor_logo_url,
    description,
    logo_url,
    priority,
    status,
    requested_date,
    due_date,
    needs_shorts,
    needs_tracksuit,
    needs_skirt,
    number_front,
    number_back,
    number_shorts,
    neck_type,
    sleeve_type,
    reference_notes,
  } = await req.json();

  if (!order_name || !client_name) {
    return NextResponse.json({ error: "order_name and client_name are required" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO design_orders
      (order_name, order_type, design_type, client_name, contact, sponsor, sponsor_logo_url,
       description, logo_url, priority, status, requested_date, due_date,
       needs_shorts, needs_tracksuit, needs_skirt, number_front, number_back, number_shorts,
       neck_type, sleeve_type, reference_notes)
    VALUES
      (${order_name}, ${order_type ?? "Other"}, ${design_type ?? "Jersey"}, ${client_name}, ${contact ?? null},
       ${sponsor ?? null}, ${sponsor_logo_url ?? null}, ${description ?? null}, ${logo_url ?? null},
       ${priority ?? "medium"}, ${status ?? "new"}, ${requested_date ?? null}, ${due_date ?? null},
       ${needs_shorts ?? false}, ${needs_tracksuit ?? false}, ${needs_skirt ?? false},
       ${number_front ?? null}, ${number_back ?? null}, ${number_shorts ?? null},
       ${neck_type ?? null}, ${sleeve_type ?? null}, ${reference_notes ?? null})
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
