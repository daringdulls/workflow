import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema, getDefaultOutletId } from "@/lib/pos/db";

// Public, read-only: the QR-ordering guest menu. No staff session required —
// this only ever reads available items and the table's own display name.
// Reads a query param per-request, so this must never be statically
// prerendered at build time (when there's no DB connection string yet).
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensurePosSchema();
  const { searchParams } = new URL(req.url);
  const tableId = searchParams.get("table");
  const outletId = await getDefaultOutletId();

  const outletRows = await sql`SELECT name, logo_url, currency FROM pos_outlets WHERE id = ${outletId};`;
  const tableRows = tableId ? await sql`SELECT id, name FROM pos_tables WHERE id = ${tableId} AND outlet_id = ${outletId};` : [];

  const categories = await sql`SELECT id, name, sort_order FROM pos_categories WHERE outlet_id = ${outletId} ORDER BY sort_order, name;`;
  const items = await sql`
    SELECT i.id, i.category_id, i.name, i.description, i.image_url, i.price,
      COALESCE(array_agg(g.id) FILTER (WHERE g.id IS NOT NULL), ARRAY[]::int[]) AS modifier_group_ids
    FROM pos_menu_items i
    LEFT JOIN pos_item_modifier_groups img ON img.item_id = i.id
    LEFT JOIN pos_modifier_groups g ON g.id = img.group_id
    WHERE i.outlet_id = ${outletId} AND i.is_available = true
    GROUP BY i.id
    ORDER BY i.sort_order, i.name;
  `;
  const groups = await sql`SELECT * FROM pos_modifier_groups WHERE outlet_id = ${outletId};`;
  const options = await sql`
    SELECT o.* FROM pos_modifier_options o JOIN pos_modifier_groups g ON g.id = o.group_id WHERE g.outlet_id = ${outletId} ORDER BY o.sort_order;
  `;
  const modifierGroups = groups.map((g) => ({ ...g, options: options.filter((o) => o.group_id === g.id) }));

  return NextResponse.json({
    outlet: outletRows[0],
    table: tableRows[0] ?? null,
    categories,
    items,
    modifierGroups,
  });
}
