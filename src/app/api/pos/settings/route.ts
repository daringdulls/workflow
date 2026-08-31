import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, logAudit } from "@/lib/pos/api-helpers";

export async function GET() {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  const rows = await sql`SELECT * FROM pos_outlets WHERE id = ${guard.session.outletId};`;
  return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest) {
  const guard = await requireSession("settings");
  if ("error" in guard) return guard.error;
  const b = await req.json();

  const existingRows = await sql`SELECT * FROM pos_outlets WHERE id = ${guard.session.outletId};`;
  const existing = existingRows[0];

  const rows = await sql`
    UPDATE pos_outlets SET
      name = ${b.name ?? existing.name},
      logo_url = ${b.logo_url !== undefined ? b.logo_url : existing.logo_url},
      address = ${b.address !== undefined ? b.address : existing.address},
      phone = ${b.phone !== undefined ? b.phone : existing.phone},
      email = ${b.email !== undefined ? b.email : existing.email},
      currency = ${b.currency ?? existing.currency},
      tax_percent = ${b.tax_percent ?? existing.tax_percent},
      service_charge_percent = ${b.service_charge_percent ?? existing.service_charge_percent},
      discount_auth_limit = ${b.discount_auth_limit ?? existing.discount_auth_limit},
      receipt_footer = ${b.receipt_footer !== undefined ? b.receipt_footer : existing.receipt_footer},
      order_number_prefix = ${b.order_number_prefix ?? existing.order_number_prefix}
    WHERE id = ${guard.session.outletId}
    RETURNING *;
  `;

  await logAudit({
    outletId: guard.session.outletId,
    staffId: guard.session.staffId,
    action: "settings_updated",
    entityType: "outlet",
    entityId: guard.session.outletId,
    oldValue: existing,
    newValue: rows[0],
  });

  return NextResponse.json(rows[0]);
}
