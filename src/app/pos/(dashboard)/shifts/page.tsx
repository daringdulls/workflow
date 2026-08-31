"use client";

import { useEffect, useState } from "react";
import { Shift, PAYMENT_METHOD_LABEL, PaymentMethod, money } from "@/lib/pos/types";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
  return res.json();
}

interface CurrentShift extends Shift {
  payment_summary: { method: PaymentMethod; total: string }[];
}

export default function ShiftsPage() {
  const [current, setCurrent] = useState<CurrentShift | null | undefined>(undefined);
  const [history, setHistory] = useState<Shift[]>([]);
  const [openingCash, setOpeningCash] = useState(0);
  const [closingCash, setClosingCash] = useState(0);
  const [closing, setClosing] = useState(false);
  const [result, setResult] = useState<Shift | null>(null);

  async function load() {
    const [c, h] = await Promise.all([api<CurrentShift | null>("/api/pos/shifts/current"), api<Shift[]>("/api/pos/shifts")]);
    setCurrent(c);
    setHistory(h);
    if (c) setClosingCash(money(Number(c.opening_cash) + Number(c.payment_summary.find((p) => p.method === "cash")?.total ?? 0)));
  }
  useEffect(() => {
    load();
  }, []);

  async function openShift() {
    await api("/api/pos/shifts", { method: "POST", body: JSON.stringify({ opening_cash: openingCash }) });
    load();
  }

  async function closeShift() {
    if (!current) return;
    const closed = await api<Shift>(`/api/pos/shifts/${current.id}/close`, { method: "POST", body: JSON.stringify({ closing_cash_actual: closingCash }) });
    setResult(closed);
    setClosing(false);
    load();
  }

  if (current === undefined) return <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Shifts & Cash Drawer</h1>

      {result && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-5">
          <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Shift closed</p>
          <Row label="Expected cash" value={result.closing_cash_expected} />
          <Row label="Actual cash counted" value={result.closing_cash_actual} />
          <Row label="Difference" value={result.cash_difference} tone={Number(result.cash_difference) === 0 ? "text-emerald-600" : "text-red-500"} />
          <button onClick={() => setResult(null)} className="mt-3 text-sm text-orange-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {!current ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-5">
          <p className="font-medium text-slate-700 dark:text-slate-200 mb-3">No open shift — start one to begin taking cash payments.</p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Opening cash</label>
            <input type="number" step="0.01" value={openingCash} onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)} className="w-32 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm" />
            <button onClick={openShift} className="ml-auto text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
              Open Shift
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-slate-700 dark:text-slate-200">Shift open since {new Date(current.opened_at).toLocaleString()}</p>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">OPEN</span>
          </div>
          <Row label="Opening cash" value={current.opening_cash} />
          {current.payment_summary.map((p) => (
            <Row key={p.method} label={PAYMENT_METHOD_LABEL[p.method] ?? p.method} value={p.total} />
          ))}
          {!closing ? (
            <button onClick={() => setClosing(true)} className="mt-4 text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Close Shift
            </button>
          ) : (
            <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              <label className="text-sm text-slate-500">Cash counted in drawer</label>
              <input type="number" step="0.01" value={closingCash} onChange={(e) => setClosingCash(parseFloat(e.target.value) || 0)} className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <div className="flex gap-2 mt-3">
                <button onClick={() => setClosing(false)} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  Cancel
                </button>
                <button onClick={closeShift} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
                  Confirm Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Recent Shifts</p>
      <div className="space-y-2">
        {history.map((s) => (
          <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-200">{s.staff_name}</p>
              <p className="text-xs text-slate-400">{new Date(s.opened_at).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className={`font-medium ${s.status === "open" ? "text-emerald-600" : "text-slate-500"}`}>{s.status}</p>
              {s.cash_difference != null && (
                <p className={`text-xs ${Number(s.cash_difference) === 0 ? "text-slate-400" : "text-red-500"}`}>
                  {Number(s.cash_difference) > 0 ? "+" : ""}
                  {Number(s.cash_difference).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string | number | null; tone?: string }) {
  return (
    <div className={`flex justify-between text-sm py-0.5 ${tone ?? "text-slate-500"}`}>
      <span>{label}</span>
      <span>{money(value ?? 0).toFixed(2)}</span>
    </div>
  );
}
