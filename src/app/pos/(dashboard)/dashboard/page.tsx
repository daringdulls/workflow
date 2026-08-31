"use client";

import { useEffect, useState } from "react";
import { TABLE_STATUS_LABEL, TableStatus, money } from "@/lib/pos/types";

async function api<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

interface DashboardData {
  date: string;
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  dineInSales: number;
  takeawaySales: number;
  deliverySales: number;
  totalDiscounts: number;
  refunds: number;
  outstanding: number;
  openOrders: { count: number; value: string };
  tables: Record<string, number>;
  expensesToday: number;
  netSales: number;
  paymentsByMethod: { method: string; total: string }[];
  topItems: { name_snapshot: string; qty: string; revenue: string }[];
  lowStock: { name: string; stock_qty: string; reorder_level: string; unit: string }[];
  hourly: { hour: number; total: string }[];
  trend: { day: string; total: string }[];
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api<DashboardData>(`/api/pos/dashboard?date=${date}`).then(setData);
  }, [date]);

  if (!data) return <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>;

  const maxHourly = Math.max(1, ...data.hourly.map((h) => Number(h.total)));
  const maxTrend = Math.max(1, ...data.trend.map((t) => Number(t.total)));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Tile label="Total Sales" value={money(data.totalSales).toFixed(2)} accent="text-orange-600" />
        <Tile label="Orders" value={String(data.orderCount)} />
        <Tile label="Avg Order Value" value={money(data.avgOrderValue).toFixed(2)} />
        <Tile label="Net Sales" value={money(data.netSales).toFixed(2)} accent="text-emerald-600" />
        <Tile label="Dine-in Sales" value={money(data.dineInSales).toFixed(2)} />
        <Tile label="Takeaway Sales" value={money(data.takeawaySales).toFixed(2)} />
        <Tile label="Delivery Sales" value={money(data.deliverySales).toFixed(2)} />
        <Tile label="Discounts" value={money(data.totalDiscounts).toFixed(2)} accent="text-amber-600" />
        <Tile label="Refunds" value={money(data.refunds).toFixed(2)} accent="text-red-500" />
        <Tile label="Outstanding" value={money(data.outstanding).toFixed(2)} accent="text-red-500" />
        <Tile label="Open Orders" value={String(data.openOrders.count)} />
        <Tile label="Today's Expenses" value={money(data.expensesToday).toFixed(2)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Sales by Payment Method</p>
          <div className="space-y-2">
            {data.paymentsByMethod.map((p) => (
              <div key={p.method} className="flex justify-between text-sm">
                <span className="capitalize text-slate-500">{p.method.replace("_", " ")}</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{money(p.total).toFixed(2)}</span>
              </div>
            ))}
            {data.paymentsByMethod.length === 0 && <p className="text-sm text-slate-400">No payments yet today.</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Table Status</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TABLE_STATUS_LABEL).map(([status, label]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{data.tables[status as TableStatus] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Hourly Sales</p>
        <div className="flex items-end gap-1 h-32">
          {Array.from({ length: 24 }).map((_, hour) => {
            const val = Number(data.hourly.find((h) => h.hour === hour)?.total ?? 0);
            return (
              <div key={hour} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${hour}:00 — ${val.toFixed(2)}`}>
                <div className="w-full bg-orange-400 dark:bg-orange-500 rounded-t" style={{ height: `${(val / maxHourly) * 100}%`, minHeight: val > 0 ? 3 : 0 }} />
                {hour % 3 === 0 && <span className="text-[9px] text-slate-400">{hour}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">14-Day Sales Trend</p>
        <div className="flex items-end gap-1.5 h-28">
          {data.trend.map((t) => (
            <div key={t.day} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${t.day} — ${Number(t.total).toFixed(2)}`}>
              <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-t" style={{ height: `${(Number(t.total) / maxTrend) * 100}%`, minHeight: 3 }} />
              <span className="text-[9px] text-slate-400">{t.day.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Top-Selling Items</p>
          <div className="space-y-2">
            {data.topItems.map((i) => (
              <div key={i.name_snapshot} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{i.name_snapshot} × {i.qty}</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{Number(i.revenue).toFixed(2)}</span>
              </div>
            ))}
            {data.topItems.length === 0 && <p className="text-sm text-slate-400">No sales yet today.</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Low Stock Items</p>
          <div className="space-y-2">
            {data.lowStock.map((i) => (
              <div key={i.name} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{i.name}</span>
                <span className="font-medium text-red-500">{i.stock_qty} / {i.reorder_level} {i.unit}</span>
              </div>
            ))}
            {data.lowStock.length === 0 && <p className="text-sm text-slate-400">All stock levels healthy.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
      <p className={`text-lg font-semibold ${accent ?? "text-slate-800 dark:text-slate-100"}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
