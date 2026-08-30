import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";
import { hashPin } from "@/lib/pos/auth";

export async function GET() {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  const rows = await sql`
    SELECT id, outlet_id, name, role, phone, email, department, active, created_at
    FROM pos_staff WHERE outlet_id = ${guard.session.outletId} ORDER BY name;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("staff");
  if ("error" in guard) return guard.error;
  const b = await req.json();
  if (!b.name || !b.role || !b.pin) {
    return NextResponse.json({ error: "name, role and pin are required" }, { status: 400 });
  }
  if (!/^\d{4,6}$/.test(String(b.pin))) {
    return NextResponse.json({ error: "PIN must be 4-6 digits" }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO pos_staff (outlet_id, name, role, pin_hash, phone, email, department)
    VALUES (${guard.session.outletId}, ${b.name}, ${b.role}, ${await hashPin(String(b.pin))}, ${b.phone ?? null}, ${b.email ?? null}, ${b.department ?? null})
    RETURNING id, outlet_id, name, role, phone, email, department, active, created_at;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
