import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const rows = await sql`
    SELECT * FROM pos_customers
    WHERE outlet_id = ${guard.session.outletId}
      AND (${q}::text IS NULL OR name ILIKE ${"%" + (q ?? "") + "%"} OR phone ILIKE ${"%" + (q ?? "") + "%"})
    ORDER BY name
    LIMIT 100;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("customers");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const rows = await sql`
    INSERT INTO pos_customers (outlet_id, name, phone, email, birthday, address, nationality, notes, dietary_preferences, allergies)
    VALUES (
      ${guard.session.outletId}, ${b.name}, ${b.phone ?? null}, ${b.email ?? null}, ${b.birthday ?? null},
      ${b.address ?? null}, ${b.nationality ?? null}, ${b.notes ?? null}, ${b.dietary_preferences ?? null}, ${b.allergies ?? null}
    )
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
