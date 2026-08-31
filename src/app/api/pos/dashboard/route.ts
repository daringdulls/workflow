import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/pos/api-helpers";

export async function GET(req: NextRequest) {
  const guard = await requireSession("reports");
  if ("error" in guard) return guard.error;
  const outletId = guard.session.outletId;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const paidOrdersToday = sql`
    SELECT * FROM pos_orders WHERE outlet_id = ${outletId} AND status = 'paid' AND closed_at::date = ${date}::date;
  `;
  const openOrders = sql`
    SELECT COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0) AS value FROM pos_orders
    WHERE outlet_id = ${outletId} AND status NOT IN ('paid', 'void', 'cancelled') AND created_at::date = ${date}::date;
  `;
  const outstanding = sql`
    SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS total FROM pos_orders
    WHERE outlet_id = ${outletId} AND status = 'billed';
  `;
  const tables = sql`SELECT status, COUNT(*)::int AS count FROM pos_tables WHERE outlet_id = ${outletId} GROUP BY status;`;
  const expensesToday = sql`
    SELECT COALESCE(SUM(amount), 0) AS total FROM pos_expenses WHERE outlet_id = ${outletId} AND expense_date = ${date}::date;
  `;
  const paymentsByMethod = sql`
    SELECT p.method, COALESCE(SUM(p.amount), 0) AS total
    FROM pos_payments p JOIN pos_orders o ON o.id = p.order_id
    WHERE o.outlet_id = ${outletId} AND p.created_at::date = ${date}::date AND p.is_refund = false
    GROUP BY p.method;
  `;
  const refundsToday = sql`
    SELECT COALESCE(SUM(amount), 0) AS total FROM pos_payments p JOIN pos_orders o ON o.id = p.order_id
    WHERE o.outlet_id = ${outletId} AND p.created_at::date = ${date}::date AND p.is_refund = true;
  `;
  const topItems = sql`
    SELECT oi.name_snapshot, SUM(oi.quantity)::numeric AS qty, SUM(oi.quantity * oi.unit_price) AS revenue
    FROM pos_order_items oi JOIN pos_orders o ON o.id = oi.order_id
    WHERE o.outlet_id = ${outletId} AND o.status = 'paid' AND o.closed_at::date = ${date}::date AND oi.is_void = false
    GROUP BY oi.name_snapshot ORDER BY qty DESC LIMIT 8;
  `;
  const lowStock = sql`
    SELECT name, stock_qty, reorder_level, unit FROM pos_ingredients WHERE outlet_id = ${outletId} AND stock_qty <= reorder_level ORDER BY name LIMIT 10;
  `;
  const hourly = sql`
    SELECT EXTRACT(HOUR FROM closed_at)::int AS hour, COALESCE(SUM(total_amount), 0) AS total
    FROM pos_orders WHERE outlet_id = ${outletId} AND status = 'paid' AND closed_at::date = ${date}::date
    GROUP BY hour ORDER BY hour;
  `;
  const trend = sql`
    SELECT closed_at::date AS day, COALESCE(SUM(total_amount), 0) AS total
    FROM pos_orders WHERE outlet_id = ${outletId} AND status = 'paid' AND closed_at >= ${date}::date - INTERVAL '13 days'
    GROUP BY day ORDER BY day;
  `;

  const [orders, open, out, tableRows, expenses, payments, refunds, top, low, hourlyRows, trendRows] = await Promise.all([
    paidOrdersToday,
    openOrders,
    outstanding,
    tables,
    expensesToday,
    paymentsByMethod,
    refundsToday,
    topItems,
    lowStock,
    hourly,
    trend,
  ]);

  const totalSales = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const totalDiscounts = orders.reduce((s, o) => s + Number(o.discount_amount), 0);
  const byType = (type: string) => orders.filter((o) => o.order_type === type).reduce((s, o) => s + Number(o.total_amount), 0);

  return NextResponse.json({
    date,
    totalSales,
    orderCount: orders.length,
    avgOrderValue: orders.length ? totalSales / orders.length : 0,
    dineInSales: byType("dine_in"),
    takeawaySales: byType("takeaway"),
    deliverySales: byType("delivery"),
    totalDiscounts,
    refunds: Number(refunds[0].total),
    outstanding: Number(out[0].total),
    openOrders: open[0],
    tables: Object.fromEntries(tableRows.map((t) => [t.status, t.count])),
    expensesToday: Number(expenses[0].total),
    netSales: totalSales - Number(expenses[0].total),
    paymentsByMethod: payments,
    topItems: top,
    lowStock: low,
    hourly: hourlyRows,
    trend: trendRows,
  });
}
