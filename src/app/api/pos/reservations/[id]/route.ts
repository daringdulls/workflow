import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("reservations");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();

  const existingRows = await sql`SELECT * FROM pos_reservations WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  const existing = existingRows[0];
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await sql`
    UPDATE pos_reservations SET
      customer_name = ${b.customer_name ?? existing.customer_name},
      contact = ${b.contact !== undefined ? b.contact : existing.contact},
      reservation_date = ${b.reservation_date ?? existing.reservation_date},
      reservation_time = ${b.reservation_time ?? existing.reservation_time},
      guests = ${b.guests ?? existing.guests},
      table_id = ${b.table_id !== undefined ? b.table_id : existing.table_id},
      area_id = ${b.area_id !== undefined ? b.area_id : existing.area_id},
      special_requests = ${b.special_requests !== undefined ? b.special_requests : existing.special_requests},
      occasion = ${b.occasion !== undefined ? b.occasion : existing.occasion},
      deposit = ${b.deposit ?? existing.deposit},
      status = ${b.status ?? existing.status}
    WHERE id = ${id}
    RETURNING *;
  `;

  const tableId = rows[0].table_id;
  if (tableId) {
    if (rows[0].status === "confirmed") await sql`UPDATE pos_tables SET status = 'reserved' WHERE id = ${tableId} AND status = 'available';`;
    if (["cancelled", "no_show", "completed"].includes(rows[0].status)) {
      await sql`UPDATE pos_tables SET status = 'available' WHERE id = ${tableId} AND status = 'reserved';`;
    }
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("reservations");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  await sql`DELETE FROM pos_reservations WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  return NextResponse.json({ ok: true });
}
