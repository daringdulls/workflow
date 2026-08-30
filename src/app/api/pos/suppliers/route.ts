import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET() {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const rows = await sql`SELECT * FROM pos_suppliers WHERE outlet_id = ${guard.session.outletId} ORDER BY name;`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("purchasing");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const rows = await sql`
    INSERT INTO pos_suppliers (outlet_id, name, contact_person, phone, email, address, products_supplied, payment_terms)
    VALUES (${guard.session.outletId}, ${b.name}, ${b.contact_person ?? null}, ${b.phone ?? null}, ${b.email ?? null}, ${b.address ?? null}, ${b.products_supplied ?? null}, ${b.payment_terms ?? null})
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
