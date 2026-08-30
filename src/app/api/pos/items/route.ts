import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET() {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const rows = await sql`
    SELECT i.*, c.name AS category_name,
      COALESCE(
        (SELECT array_agg(group_id) FROM pos_item_modifier_groups WHERE item_id = i.id),
        ARRAY[]::int[]
      ) AS modifier_group_ids
    FROM pos_menu_items i
    LEFT JOIN pos_categories c ON c.id = i.category_id
    WHERE i.outlet_id = ${guard.session.outletId}
    ORDER BY c.sort_order NULLS LAST, i.sort_order, i.name;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireSession("menu");
  if ("error" in guard) return guard.error;
  await ensurePosSchema();
  const b = await req.json();
  if (!b.name || b.price == null) {
    return NextResponse.json({ error: "name and price are required" }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO pos_menu_items (
      outlet_id, category_id, name, description, image_url, sku, price, takeaway_price,
      delivery_price, cost_price, tax_percent, station, prep_time_minutes, is_available, is_favorite, sort_order
    ) VALUES (
      ${guard.session.outletId}, ${b.category_id ?? null}, ${b.name}, ${b.description ?? null}, ${b.image_url ?? null},
      ${b.sku ?? null}, ${b.price}, ${b.takeaway_price ?? null}, ${b.delivery_price ?? null}, ${b.cost_price ?? 0},
      ${b.tax_percent ?? null}, ${b.station ?? "Main Kitchen"}, ${b.prep_time_minutes ?? 10},
      ${b.is_available ?? true}, ${b.is_favorite ?? false}, ${b.sort_order ?? 0}
    )
    RETURNING *;
  `;
  const item = rows[0];
  if (Array.isArray(b.modifier_group_ids)) {
    for (const gid of b.modifier_group_ids) {
      await sql`INSERT INTO pos_item_modifier_groups (item_id, group_id) VALUES (${item.id}, ${gid}) ON CONFLICT DO NOTHING;`;
    }
  }
  return NextResponse.json(item, { status: 201 });
}
