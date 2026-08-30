import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

// groupBy: category | item | waiter | cashier | payment_method | order_type | table | day
export async function GET(req: NextRequest) {
  const guard = await requireSession("reports");
  if ("error" in guard) return guard.error;
  const outletId = guard.session.outletId;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const groupBy = searchParams.get("groupBy") ?? "day";

  let rows;
  switch (groupBy) {
    case "category":
      rows = await sql`
        SELECT COALESCE(c.name, 'Uncategorized') AS label, SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.unit_price) AS revenue
        FROM pos_order_items oi
        JOIN pos_orders o ON o.id = oi.order_id
        LEFT JOIN pos_menu_items mi ON mi.id = oi.menu_item_id
        LEFT JOIN pos_categories c ON c.id = mi.category_id
        WHERE o.outlet_id = ${outletId} AND o.status = 'paid' AND oi.is_void = false AND o.closed_at::date BETWEEN ${from}::date AND ${to}::date
        GROUP BY c.name ORDER BY revenue DESC;
      `;
      break;
    case "item":
      rows = await sql`
        SELECT oi.name_snapshot AS label, SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.unit_price) AS revenue,
          SUM(oi.quantity * COALESCE(mi.cost_price, 0)) AS cost
        FROM pos_order_items oi
        JOIN pos_orders o ON o.id = oi.order_id
        LEFT JOIN pos_menu_items mi ON mi.id = oi.menu_item_id
        WHERE o.outlet_id = ${outletId} AND o.status = 'paid' AND oi.is_void = false AND o.closed_at::date BETWEEN ${from}::date AND ${to}::date
        GROUP BY oi.name_snapshot ORDER BY revenue DESC;
      `;
      break;
    case "waiter":
      rows = await sql`
        SELECT COALESCE(s.name, 'Unassigned') AS label, COUNT(*)::int AS qty, SUM(o.total_amount) AS revenue
        FROM pos_orders o LEFT JOIN pos_staff s ON s.id = o.waiter_id
        WHERE o.outlet_id = ${outletId} AND o.status = 'paid' AND o.closed_at::date BETWEEN ${from}::date AND ${to}::date
        GROUP BY s.name ORDER BY revenue DESC;
      `;
      break;
    case "cashier":
      rows = await sql`
        SELECT COALESCE(s.name, 'Unassigned') AS label, COUNT(*)::int AS qty, SUM(o.total_amount) AS revenue
        FROM pos_orders o LEFT JOIN pos_staff s ON s.id = o.cashier_id
        WHERE o.outlet_id = ${outletId} AND o.status = 'paid' AND o.closed_at::date BETWEEN ${from}::date AND ${to}::date
        GROUP BY s.name ORDER BY revenue DESC;
      `;
      break;
    case "payment_method":
      rows = await sql`
        SELECT p.method AS label, COUNT(*)::int AS qty, SUM(p.amount) AS revenue
        FROM pos_payments p JOIN pos_orders o ON o.id = p.order_id
        WHERE o.outlet_id = ${outletId} AND p.is_refund = false AND p.created_at::date BETWEEN ${from}::date AND ${to}::date
        GROUP BY p.method ORDER BY revenue DESC;
      `;
      break;
    case "order_type":
      rows = await sql`
        SELECT o.order_type AS label, COUNT(*)::int AS qty, SUM(o.total_amount) AS revenue
        FROM pos_orders o
        WHERE o.outlet_id = ${outletId} AND o.status = 'paid' AND o.closed_at::date BETWEEN ${from}::date AND ${to}::date
        GROUP BY o.order_type ORDER BY revenue DESC;
      `;
      break;
    case "table":
      rows = await sql`
        SELECT COALESCE(t.name, 'No table') AS label, COUNT(*)::int AS qty, SUM(o.total_amount) AS revenue
        FROM pos_orders o LEFT JOIN pos_tables t ON t.id = o.table_id
        WHERE o.outlet_id = ${outletId} AND o.status = 'paid' AND o.closed_at::date BETWEEN ${from}::date AND ${to}::date
        GROUP BY t.name ORDER BY revenue DESC;
      `;
      break;
    default:
      rows = await sql`
        SELECT o.closed_at::date::text AS label, COUNT(*)::int AS qty, SUM(o.total_amount) AS revenue
        FROM pos_orders o
        WHERE o.outlet_id = ${outletId} AND o.status = 'paid' AND o.closed_at::date BETWEEN ${from}::date AND ${to}::date
        GROUP BY label ORDER BY label;
      `;
  }

  const totalsRows = await sql`
    SELECT
      COALESCE(SUM(total_amount), 0) AS gross_sales,
      COALESCE(SUM(discount_amount), 0) AS discounts,
      COALESCE(SUM(tax_amount), 0) AS tax,
      COALESCE(SUM(service_charge_amount), 0) AS service_charge,
      COALESCE(SUM(tip_amount), 0) AS tips,
      COUNT(*)::int AS order_count
    FROM pos_orders
    WHERE outlet_id = ${outletId} AND status = 'paid' AND closed_at::date BETWEEN ${from}::date AND ${to}::date;
  `;
  const expenseRows = await sql`
    SELECT COALESCE(SUM(amount), 0) AS total FROM pos_expenses WHERE outlet_id = ${outletId} AND expense_date BETWEEN ${from}::date AND ${to}::date;
  `;
  const voidRows = await sql`
    SELECT COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0) AS total FROM pos_orders
    WHERE outlet_id = ${outletId} AND status = 'void' AND updated_at::date BETWEEN ${from}::date AND ${to}::date;
  `;

  return NextResponse.json({
    from,
    to,
    groupBy,
    rows,
    totals: totalsRows[0],
    expenses: Number(expenseRows[0].total),
    voids: voidRows[0],
  });
}
