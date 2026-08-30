import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const rows = await sql`
    SELECT r.*, i.name AS ingredient_name, i.unit
    FROM pos_recipe_items r
    JOIN pos_ingredients i ON i.id = r.ingredient_id
    WHERE r.menu_item_id = ${id}
    ORDER BY i.name;
  `;
  return NextResponse.json(rows);
}

// Replaces the whole recipe list for this item in one call — simpler for
// the menu-editor UI than tracking per-row create/update/delete.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession("menu");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const { ingredients } = await req.json();

  await sql`DELETE FROM pos_recipe_items WHERE menu_item_id = ${id};`;
  if (Array.isArray(ingredients)) {
    for (const ing of ingredients) {
      if (!ing.ingredient_id || !ing.quantity) continue;
      await sql`
        INSERT INTO pos_recipe_items (menu_item_id, ingredient_id, quantity)
        VALUES (${id}, ${ing.ingredient_id}, ${ing.quantity});
      `;
    }
  }

  const rows = await sql`
    SELECT r.*, i.name AS ingredient_name, i.unit
    FROM pos_recipe_items r
    JOIN pos_ingredients i ON i.id = r.ingredient_id
    WHERE r.menu_item_id = ${id}
    ORDER BY i.name;
  `;
  return NextResponse.json(rows);
}
