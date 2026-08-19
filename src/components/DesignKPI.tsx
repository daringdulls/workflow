"use client";

import { useMemo } from "react";
import { DesignOrder, DesignStatus } from "@/lib/types";

function localDateKey(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STATUS_META: { key: DesignStatus; label: string; className: string }[] = [
  { key: "new", label: "New", className: "bg-slate-400" },
  { key: "in_progress", label: "In progress", className: "bg-design" },
  { key: "review", label: "Review", className: "bg-amber-500" },
  { key: "delivered", label: "Delivered", className: "bg-emerald-500" },
];

export default function DesignKPI({ orders }: { orders: DesignOrder[] }) {
  const stats = useMemo(() => {
    const now = new Date();
    const todayKey = localDateKey(now.toISOString());
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let deliveredThisMonth = 0;

    for (const o of orders) {
      const created = new Date(o.created_at);
      const key = localDateKey(o.created_at);
      if (key === todayKey) today++;
      if (created >= weekAgo) thisWeek++;
      if (created >= monthStart) {
        thisMonth++;
        if (o.status === "delivered") deliveredThisMonth++;
      }
    }

    // Last 14 days, oldest first, for the daily-volume bar chart.
    const days: { key: string; label: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = localDateKey(d.toISOString());
      days.push({ key, label: String(d.getDate()), count: 0 });
    }
    const dayIndex = new Map(days.map((d, idx) => [d.key, idx]));
    for (const o of orders) {
      const key = localDateKey(o.created_at);
      const idx = dayIndex.get(key);
      if (idx !== undefined) days[idx].count++;
    }

    const statusCounts = STATUS_META.map((s) => ({
      ...s,
      count: orders.filter((o) => o.status === s.key).length,
    }));

    return { today, thisWeek, thisMonth, deliveredThisMonth, total: orders.length, days, statusCounts };
  }, [orders]);

  const maxDay = Math.max(1, ...stats.days.map((d) => d.count));
  const maxStatus = Math.max(1, ...stats.statusCounts.map((s) => s.count));

  const tiles = [
    { label: "Today", value: stats.today },
    { label: "This week", value: stats.thisWeek },
    { label: "This month", value: stats.thisMonth },
    { label: "Total requests", value: stats.total },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-2 w-2 rounded-full bg-design" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Design KPIs</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-3.5 py-3"
          >
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">{t.value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-6">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Designs per day — last 14 days</p>
          <div className="flex items-end gap-1.5 h-24">
            {stats.days.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center justify-end gap-1 h-full" title={`${d.count} on ${d.key}`}>
                <div
                  className="w-full max-w-[14px] rounded-t bg-design min-h-[2px] transition-all"
                  style={{ height: `${(d.count / maxDay) * 100}%` }}
                />
                <span className="text-[9px] text-slate-300 dark:text-slate-600 tabular-nums">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sm:w-48">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">By status</p>
          <div className="space-y-2">
            {stats.statusCounts.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 w-20 shrink-0 truncate">{s.label}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${s.className}`} style={{ width: `${(s.count / maxStatus) * 100}%` }} />
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums w-4 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
