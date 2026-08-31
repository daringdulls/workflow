import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const rows = await sql`SELECT * FROM pos_customers WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const orders = await sql`
    SELECT id, order_number, order_type, total_amount, status, created_at FROM pos_orders
    WHERE customer_id = ${id} ORDER BY created_at DESC LIMIT 50;
  `;
  return NextResponse.json({ ...rows[0], orders });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("customers");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();
  const existingRows = await sql`SELECT * FROM pos_customers WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  const existing = existingRows[0];
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await sql`
    UPDATE pos_customers SET
      name = ${b.name ?? existing.name},
      phone = ${b.phone !== undefined ? b.phone : existing.phone},
      email = ${b.email !== undefined ? b.email : existing.email},
      birthday = ${b.birthday !== undefined ? b.birthday : existing.birthday},
      address = ${b.address !== undefined ? b.address : existing.address},
      nationality = ${b.nationality !== undefined ? b.nationality : existing.nationality},
      notes = ${b.notes !== undefined ? b.notes : existing.notes},
      dietary_preferences = ${b.dietary_preferences !== undefined ? b.dietary_preferences : existing.dietary_preferences},
      allergies = ${b.allergies !== undefined ? b.allergies : existing.allergies},
      loyalty_points = ${b.loyalty_points ?? existing.loyalty_points},
      credit_balance = ${b.credit_balance ?? existing.credit_balance}
    WHERE id = ${id}
    RETURNING *;
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("customers");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  await sql`DELETE FROM pos_customers WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  return NextResponse.json({ ok: true });
}
