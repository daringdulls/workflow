"use client";

import { useEffect, useState } from "react";

async function api<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

interface ReportRow {
  label: string;
  qty: string;
  revenue: string;
  cost?: string;
}
interface ReportData {
  from: string;
  to: string;
  groupBy: string;
  rows: ReportRow[];
  totals: { gross_sales: string; discounts: string; tax: string; service_charge: string; tips: string; order_count: number };
  expenses: number;
  voids: { count: number; total: string };
}

const GROUP_OPTIONS = [
  { value: "day", label: "By Day" },
  { value: "category", label: "By Category" },
  { value: "item", label: "By Item" },
  { value: "waiter", label: "By Waiter" },
  { value: "cashier", label: "By Cashier" },
  { value: "payment_method", label: "By Payment Method" },
  { value: "order_type", label: "By Order Type" },
  { value: "table", label: "By Table" },
];

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(daysAgoISO(0));
  const [groupBy, setGroupBy] = useState("day");
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    api<ReportData>(`/api/pos/reports/sales?from=${from}&to=${to}&groupBy=${groupBy}`).then(setData);
  }, [from, to, groupBy]);

  function exportCsv() {
    if (!data) return;
    const header = "Label,Quantity,Revenue" + (groupBy === "item" ? ",Cost" : "");
    const lines = data.rows.map((r) => [r.label, r.qty, r.revenue, r.cost ?? ""].filter((_, i) => groupBy === "item" || i < 3).join(","));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${groupBy}-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const netSales = data ? Number(data.totals.gross_sales) - Number(data.totals.discounts) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Reports</h1>
        <button onClick={exportCsv} className="text-sm px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5" />
        <span className="text-slate-400 text-sm">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5" />
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 ml-auto">
          {GROUP_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Tile label="Gross Sales" value={Number(data.totals.gross_sales).toFixed(2)} />
            <Tile label="Net Sales" value={netSales.toFixed(2)} accent="text-emerald-600" />
            <Tile label="Orders" value={String(data.totals.order_count)} />
            <Tile label="Discounts" value={Number(data.totals.discounts).toFixed(2)} accent="text-amber-600" />
            <Tile label="Tax Collected" value={Number(data.totals.tax).toFixed(2)} />
            <Tile label="Service Charge" value={Number(data.totals.service_charge).toFixed(2)} />
            <Tile label="Tips" value={Number(data.totals.tips).toFixed(2)} />
            <Tile label="Expenses" value={data.expenses.toFixed(2)} />
            <Tile label="Voided Orders" value={`${data.voids.count} (${Number(data.voids.total).toFixed(2)})`} accent="text-red-500" />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-2.5">{GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}</th>
                  <th className="px-4 py-2.5">Qty / Orders</th>
                  <th className="px-4 py-2.5">Revenue</th>
                  {groupBy === "item" && <th className="px-4 py-2.5">Food Cost %</th>}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.label} className="border-b border-slate-50 dark:border-slate-800/60">
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200 capitalize">{r.label.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5 text-slate-500">{r.qty}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">{Number(r.revenue).toFixed(2)}</td>
                    {groupBy === "item" && <td className="px-4 py-2.5 text-slate-500">{r.cost && Number(r.revenue) > 0 ? `${((Number(r.cost) / Number(r.revenue)) * 100).toFixed(1)}%` : "—"}</td>}
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                      No data for this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
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
