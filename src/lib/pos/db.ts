import { sql } from "@/lib/db";

// Idempotent schema setup for the restaurant POS module, mirroring the
// pattern in src/lib/db.ts::ensureSchema(). Kept in its own file/namespace
// (all tables prefixed pos_) so the POS module never collides with the
// existing WorkFlow tables and can be deployed on the same Neon database.
let posSchemaReady = false;

export async function ensurePosSchema() {
  if (posSchemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_outlets (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'My Restaurant',
      logo_url TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      currency TEXT NOT NULL DEFAULT 'MVR',
      tax_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
      service_charge_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
      discount_auth_limit NUMERIC(12,2) NOT NULL DEFAULT 20,
      timezone TEXT NOT NULL DEFAULT 'Indian/Maldives',
      receipt_footer TEXT,
      order_number_prefix TEXT NOT NULL DEFAULT 'ORD',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_staff (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'waiter',
      pin_hash TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      department TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_dining_areas (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_tables (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      area_id INTEGER REFERENCES pos_dining_areas(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      pos_x INTEGER NOT NULL DEFAULT 0,
      pos_y INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'available',
      qr_code TEXT UNIQUE
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_categories (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_menu_items (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES pos_categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      sku TEXT,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      takeaway_price NUMERIC(12,2),
      delivery_price NUMERIC(12,2),
      cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      tax_percent NUMERIC(6,3),
      station TEXT NOT NULL DEFAULT 'Main Kitchen',
      prep_time_minutes INTEGER NOT NULL DEFAULT 10,
      is_available BOOLEAN NOT NULL DEFAULT true,
      is_favorite BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_modifier_groups (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      min_select INTEGER NOT NULL DEFAULT 0,
      max_select INTEGER NOT NULL DEFAULT 1,
      required BOOLEAN NOT NULL DEFAULT false
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_modifier_options (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES pos_modifier_groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price_delta NUMERIC(12,2) NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_item_modifier_groups (
      item_id INTEGER NOT NULL REFERENCES pos_menu_items(id) ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES pos_modifier_groups(id) ON DELETE CASCADE,
      PRIMARY KEY (item_id, group_id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_ingredients (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'g',
      stock_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
      reorder_level NUMERIC(14,3) NOT NULL DEFAULT 0,
      cost_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0,
      supplier_id INTEGER,
      expiry_date DATE,
      batch_number TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_recipe_items (
      id SERIAL PRIMARY KEY,
      menu_item_id INTEGER NOT NULL REFERENCES pos_menu_items(id) ON DELETE CASCADE,
      ingredient_id INTEGER NOT NULL REFERENCES pos_ingredients(id) ON DELETE CASCADE,
      quantity NUMERIC(14,3) NOT NULL DEFAULT 0
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_customers (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      birthday DATE,
      address TEXT,
      nationality TEXT,
      notes TEXT,
      dietary_preferences TEXT,
      allergies TEXT,
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      credit_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_reservations (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      customer_id INTEGER REFERENCES pos_customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      contact TEXT,
      reservation_date DATE NOT NULL,
      reservation_time TEXT NOT NULL,
      guests INTEGER NOT NULL DEFAULT 2,
      table_id INTEGER REFERENCES pos_tables(id) ON DELETE SET NULL,
      area_id INTEGER REFERENCES pos_dining_areas(id) ON DELETE SET NULL,
      special_requests TEXT,
      occasion TEXT,
      deposit NUMERIC(12,2) NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'phone',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_orders (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      order_number TEXT NOT NULL,
      order_type TEXT NOT NULL DEFAULT 'dine_in',
      table_id INTEGER REFERENCES pos_tables(id) ON DELETE SET NULL,
      customer_id INTEGER REFERENCES pos_customers(id) ON DELETE SET NULL,
      waiter_id INTEGER REFERENCES pos_staff(id) ON DELETE SET NULL,
      cashier_id INTEGER REFERENCES pos_staff(id) ON DELETE SET NULL,
      guest_count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'open',
      subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
      discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      discount_reason TEXT,
      service_charge_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      tip_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      is_complimentary BOOLEAN NOT NULL DEFAULT false,
      notes TEXT,
      room_number TEXT,
      guest_name TEXT,
      hotel_name TEXT,
      source TEXT NOT NULL DEFAULT 'pos',
      delivery_address TEXT,
      delivery_phone TEXT,
      delivery_driver TEXT,
      delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
      pickup_time TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      closed_at TIMESTAMPTZ
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER REFERENCES pos_menu_items(id) ON DELETE SET NULL,
      name_snapshot TEXT NOT NULL,
      quantity NUMERIC(8,2) NOT NULL DEFAULT 1,
      unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      modifiers JSONB NOT NULL DEFAULT '[]',
      notes TEXT,
      kitchen_notes TEXT,
      station TEXT NOT NULL DEFAULT 'Main Kitchen',
      status TEXT NOT NULL DEFAULT 'new',
      is_complimentary BOOLEAN NOT NULL DEFAULT false,
      is_void BOOLEAN NOT NULL DEFAULT false,
      void_reason TEXT,
      sent_at TIMESTAMPTZ,
      ready_at TIMESTAMPTZ,
      served_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_payments (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
      method TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      amount_received NUMERIC(12,2),
      reference TEXT,
      room_number TEXT,
      guest_name TEXT,
      received_by INTEGER REFERENCES pos_staff(id) ON DELETE SET NULL,
      is_refund BOOLEAN NOT NULL DEFAULT false,
      refund_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_stock_movements (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      ingredient_id INTEGER NOT NULL REFERENCES pos_ingredients(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      quantity NUMERIC(14,3) NOT NULL,
      unit_cost NUMERIC(12,4),
      reference TEXT,
      reason TEXT,
      department TEXT,
      staff_id INTEGER REFERENCES pos_staff(id) ON DELETE SET NULL,
      approved_by INTEGER REFERENCES pos_staff(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_suppliers (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      products_supplied TEXT,
      payment_terms TEXT,
      balance NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_purchase_orders (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      supplier_id INTEGER REFERENCES pos_suppliers(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      order_date DATE NOT NULL DEFAULT CURRENT_DATE,
      expected_date DATE,
      invoice_number TEXT,
      total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      due_date DATE,
      created_by INTEGER REFERENCES pos_staff(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_purchase_order_items (
      id SERIAL PRIMARY KEY,
      po_id INTEGER NOT NULL REFERENCES pos_purchase_orders(id) ON DELETE CASCADE,
      ingredient_id INTEGER REFERENCES pos_ingredients(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
      unit_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      received BOOLEAN NOT NULL DEFAULT false
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_expenses (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      supplier_id INTEGER REFERENCES pos_suppliers(id) ON DELETE SET NULL,
      description TEXT,
      receipt_url TEXT,
      entered_by INTEGER REFERENCES pos_staff(id) ON DELETE SET NULL,
      approved_by INTEGER REFERENCES pos_staff(id) ON DELETE SET NULL,
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_shifts (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES pos_outlets(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES pos_staff(id) ON DELETE CASCADE,
      terminal TEXT NOT NULL DEFAULT 'Terminal 1',
      opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
      closing_cash_expected NUMERIC(12,2),
      closing_cash_actual NUMERIC(12,2),
      cash_difference NUMERIC(12,2),
      status TEXT NOT NULL DEFAULT 'open',
      notes TEXT,
      opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      closed_at TIMESTAMPTZ
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_audit_log (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER REFERENCES pos_outlets(id) ON DELETE CASCADE,
      staff_id INTEGER REFERENCES pos_staff(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      old_value JSONB,
      new_value JSONB,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // --- Seed a default outlet + admin login + a small starter menu, so the
  // POS is usable immediately after first deploy instead of being empty. ---
  const outlets = await sql`SELECT id FROM pos_outlets LIMIT 1;`;
  let outletId: number;
  if (outlets.length === 0) {
    const created = await sql`
      INSERT INTO pos_outlets (name, currency, tax_percent, service_charge_percent, receipt_footer)
      VALUES ('My Restaurant', 'MVR', 6, 10, 'Thank you for dining with us!')
      RETURNING id;
    `;
    outletId = created[0].id as number;
  } else {
    outletId = outlets[0].id as number;
  }

  const staffCount = await sql`SELECT COUNT(*)::int AS count FROM pos_staff WHERE outlet_id = ${outletId};`;
  if (staffCount[0].count === 0) {
    const { hashPin } = await import("./auth");
    await sql`
      INSERT INTO pos_staff (outlet_id, name, role, pin_hash)
      VALUES (${outletId}, 'Admin', 'admin', ${await hashPin("1234")});
    `;
  }

  const areaCount = await sql`SELECT COUNT(*)::int AS count FROM pos_dining_areas WHERE outlet_id = ${outletId};`;
  if (areaCount[0].count === 0) {
    const areaRows = await sql`
      INSERT INTO pos_dining_areas (outlet_id, name, sort_order)
      VALUES (${outletId}, 'Indoor', 1), (${outletId}, 'Outdoor', 2)
      RETURNING id;
    `;
    const indoorId = areaRows[0].id as number;
    const outdoorId = areaRows[1].id as number;
    for (let i = 1; i <= 6; i++) {
      await sql`
        INSERT INTO pos_tables (outlet_id, area_id, name, capacity, pos_x, pos_y)
        VALUES (${outletId}, ${indoorId}, ${"T" + i}, ${i % 2 === 0 ? 4 : 2}, ${(((i - 1) % 3) * 140) + 20}, ${Math.floor((i - 1) / 3) * 140 + 20});
      `;
    }
    for (let i = 7; i <= 10; i++) {
      await sql`
        INSERT INTO pos_tables (outlet_id, area_id, name, capacity, pos_x, pos_y)
        VALUES (${outletId}, ${outdoorId}, ${"T" + i}, 4, ${(((i - 7) % 4) * 140) + 20}, 20);
      `;
    }
  }

  const catCount = await sql`SELECT COUNT(*)::int AS count FROM pos_categories WHERE outlet_id = ${outletId};`;
  if (catCount[0].count === 0) {
    const cats = await sql`
      INSERT INTO pos_categories (outlet_id, name, sort_order) VALUES
      (${outletId}, 'Starters', 1),
      (${outletId}, 'Mains', 2),
      (${outletId}, 'Drinks', 3),
      (${outletId}, 'Desserts', 4)
      RETURNING id, name;
    `;
    const byName: Record<string, number> = {};
    for (const c of cats) byName[c.name as string] = c.id as number;

    const items: Array<[string, number, string, number, string]> = [
      ["Spring Rolls", byName["Starters"], "Cold Kitchen", 5.5, "Cold Kitchen"],
      ["Chicken Wings", byName["Starters"], "Hot Kitchen", 6.5, "Hot Kitchen"],
      ["Chicken Burger", byName["Mains"], "Main Kitchen", 9.5, "Main Kitchen"],
      ["Grilled Steak", byName["Mains"], "Main Kitchen", 18.0, "Main Kitchen"],
      ["Margherita Pizza", byName["Mains"], "Pizza Station", 12.0, "Pizza Station"],
      ["Fresh Orange Juice", byName["Drinks"], "Bar", 3.5, "Bar"],
      ["Cappuccino", byName["Drinks"], "Coffee Station", 3.0, "Coffee Station"],
      ["Chocolate Cake", byName["Desserts"], "Dessert Station", 5.0, "Dessert Station"],
    ];
    for (const [name, categoryId, , price, station] of items) {
      await sql`
        INSERT INTO pos_menu_items (outlet_id, category_id, name, price, cost_price, station)
        VALUES (${outletId}, ${categoryId}, ${name}, ${price}, ${Number((price * 0.32).toFixed(2))}, ${station});
      `;
    }
  }

  posSchemaReady = true;
}

export async function getDefaultOutletId(): Promise<number> {
  await ensurePosSchema();
  const rows = await sql`SELECT id FROM pos_outlets ORDER BY id LIMIT 1;`;
  return rows[0].id as number;
}
