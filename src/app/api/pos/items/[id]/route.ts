import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession, logAudit } from "@/lib/pos/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("menu");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const b = await req.json();

  const existingRows = await sql`SELECT * FROM pos_menu_items WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  if (existingRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const existing = existingRows[0];

  const rows = await sql`
    UPDATE pos_menu_items SET
      category_id = ${b.category_id !== undefined ? b.category_id : existing.category_id},
      name = ${b.name ?? existing.name},
      description = ${b.description !== undefined ? b.description : existing.description},
      image_url = ${b.image_url !== undefined ? b.image_url : existing.image_url},
      sku = ${b.sku !== undefined ? b.sku : existing.sku},
      price = ${b.price ?? existing.price},
      takeaway_price = ${b.takeaway_price !== undefined ? b.takeaway_price : existing.takeaway_price},
      delivery_price = ${b.delivery_price !== undefined ? b.delivery_price : existing.delivery_price},
      cost_price = ${b.cost_price ?? existing.cost_price},
      tax_percent = ${b.tax_percent !== undefined ? b.tax_percent : existing.tax_percent},
      station = ${b.station ?? existing.station},
      prep_time_minutes = ${b.prep_time_minutes ?? existing.prep_time_minutes},
      is_available = ${b.is_available ?? existing.is_available},
      is_favorite = ${b.is_favorite ?? existing.is_favorite},
      sort_order = ${b.sort_order ?? existing.sort_order}
    WHERE id = ${id} AND outlet_id = ${guard.session.outletId}
    RETURNING *;
  `;

  if (Array.isArray(b.modifier_group_ids)) {
    await sql`DELETE FROM pos_item_modifier_groups WHERE item_id = ${id};`;
    for (const gid of b.modifier_group_ids) {
      await sql`INSERT INTO pos_item_modifier_groups (item_id, group_id) VALUES (${id}, ${gid}) ON CONFLICT DO NOTHING;`;
    }
  }

  if (b.is_available !== undefined && b.is_available !== existing.is_available) {
    await logAudit({
      outletId: guard.session.outletId,
      staffId: guard.session.staffId,
      action: b.is_available ? "item_available" : "item_unavailable",
      entityType: "menu_item",
      entityId: Number(id),
    });
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("menu");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  await sql`DELETE FROM pos_menu_items WHERE id = ${id} AND outlet_id = ${guard.session.outletId};`;
  return NextResponse.json({ ok: true });
}
