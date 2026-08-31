import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("purchasing");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();
  const existingRows = await sql`SELECT * FROM pos_suppliers WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  const existing = existingRows[0];
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await sql`
    UPDATE pos_suppliers SET
      name = ${b.name ?? existing.name},
      contact_person = ${b.contact_person !== undefined ? b.contact_person : existing.contact_person},
      phone = ${b.phone !== undefined ? b.phone : existing.phone},
      email = ${b.email !== undefined ? b.email : existing.email},
      address = ${b.address !== undefined ? b.address : existing.address},
      products_supplied = ${b.products_supplied !== undefined ? b.products_supplied : existing.products_supplied},
      payment_terms = ${b.payment_terms !== undefined ? b.payment_terms : existing.payment_terms},
      balance = ${b.balance ?? existing.balance}
    WHERE id = ${id}
    RETURNING *;
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("purchasing");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  await sql`DELETE FROM pos_suppliers WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  return NextResponse.json({ ok: true });
}
