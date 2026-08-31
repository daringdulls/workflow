"use client";

import { useEffect, useState } from "react";
import { PosOutlet } from "@/lib/pos/types";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
  return res.json();
}

export default function SettingsPage() {
  const [form, setForm] = useState<PosOutlet | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<PosOutlet>("/api/pos/settings").then(setForm);
  }, []);

  if (!form) return <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>;

  const inputCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm";

  async function save() {
    const updated = await api<PosOutlet>("/api/pos/settings", { method: "PATCH", body: JSON.stringify(form) });
    setForm(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Settings</h1>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <div>
          <label className="text-xs text-slate-400">Restaurant name</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-slate-400">Logo URL</label>
          <input className={inputCls} value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-slate-400">Address</label>
          <input className={inputCls} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">Phone</label>
            <input className={inputCls} value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Email</label>
            <input className={inputCls} value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400">Currency</label>
            <input className={inputCls} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Tax %</label>
            <input type="number" step="0.01" className={inputCls} value={form.tax_percent} onChange={(e) => setForm({ ...form, tax_percent: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Service charge %</label>
            <input type="number" step="0.01" className={inputCls} value={form.service_charge_percent} onChange={(e) => setForm({ ...form, service_charge_percent: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">Discount auto-approve limit</label>
            <input type="number" step="0.01" className={inputCls} value={form.discount_auth_limit} onChange={(e) => setForm({ ...form, discount_auth_limit: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Order number prefix</label>
            <input className={inputCls} value={form.order_number_prefix} onChange={(e) => setForm({ ...form, order_number_prefix: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400">Receipt footer</label>
          <textarea className={inputCls} rows={2} value={form.receipt_footer ?? ""} onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })} />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
            Save Settings
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </div>
    </div>
  );
}
