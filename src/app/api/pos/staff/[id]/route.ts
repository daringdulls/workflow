import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, logAudit } from "@/lib/pos/api-helpers";
import { hashPin } from "@/lib/pos/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("staff");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();

  const existingRows = await sql`SELECT * FROM pos_staff WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  const existing = existingRows[0];
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newPinHash = b.pin ? await hashPin(String(b.pin)) : existing.pin_hash;

  const rows = await sql`
    UPDATE pos_staff SET
      name = ${b.name ?? existing.name},
      role = ${b.role ?? existing.role},
      phone = ${b.phone !== undefined ? b.phone : existing.phone},
      email = ${b.email !== undefined ? b.email : existing.email},
      department = ${b.department !== undefined ? b.department : existing.department},
      active = ${b.active ?? existing.active},
      pin_hash = ${newPinHash}
    WHERE id = ${id}
    RETURNING id, outlet_id, name, role, phone, email, department, active, created_at;
  `;

  if (b.active !== undefined && b.active !== existing.active) {
    await logAudit({
      outletId: guard.session.outletId,
      staffId: guard.session.staffId,
      action: b.active ? "staff_activated" : "staff_deactivated",
      entityType: "staff",
      entityId: Number(id),
    });
  }
  if (b.role && b.role !== existing.role) {
    await logAudit({
      outletId: guard.session.outletId,
      staffId: guard.session.staffId,
      action: "staff_role_changed",
      entityType: "staff",
      entityId: Number(id),
      oldValue: { role: existing.role },
      newValue: { role: b.role },
    });
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("staff");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  // Deactivate rather than hard-delete — staff show up as historical waiter/
  // cashier references on past orders and audit log entries.
  await sql`UPDATE pos_staff SET active = false WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  return NextResponse.json({ ok: true });
}
