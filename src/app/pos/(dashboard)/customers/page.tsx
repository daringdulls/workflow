"use client";

import { useEffect, useState } from "react";
import { PosCustomer } from "@/lib/pos/types";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
  return res.json();
}

interface CustomerDetail extends PosCustomer {
  orders?: { id: number; order_number: string; total_amount: number; status: string; created_at: string }[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<PosCustomer[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<CustomerDetail | "new" | null>(null);

  async function load(query = "") {
    const rows = await api<PosCustomer[]>(`/api/pos/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setCustomers(rows);
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const handle = setTimeout(() => load(q), 300);
    return () => clearTimeout(handle);
  }, [q]);

  async function openCustomer(c: PosCustomer) {
    const detail = await api<CustomerDetail>(`/api/pos/customers/${c.id}`);
    setEditing(detail);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Customers</h1>
        <button onClick={() => setEditing("new")} className="text-sm px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
          + Add Customer
        </button>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone…" className="w-full sm:w-80 mb-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {customers.map((c) => (
          <button key={c.id} onClick={() => openCustomer(c)} className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-md transition">
            <p className="font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
            <p className="text-xs text-slate-400">{c.phone ?? "no phone"}</p>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-amber-600">{c.loyalty_points} pts</span>
              {Number(c.credit_balance) > 0 && <span className="text-rose-500">Owes {Number(c.credit_balance).toFixed(2)}</span>}
            </div>
          </button>
        ))}
        {customers.length === 0 && <p className="text-sm text-slate-400 col-span-full py-10 text-center">No customers found.</p>}
      </div>

      {editing && <CustomerModal customer={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(q); }} />}
    </div>
  );
}

function CustomerModal({ customer, onClose, onSaved }: { customer: CustomerDetail | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    birthday: customer?.birthday?.slice(0, 10) ?? "",
    address: customer?.address ?? "",
    nationality: customer?.nationality ?? "",
    dietary_preferences: customer?.dietary_preferences ?? "",
    allergies: customer?.allergies ?? "",
    notes: customer?.notes ?? "",
  });
  const inputCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm";

  async function save() {
    if (customer) await api(`/api/pos/customers/${customer.id}`, { method: "PATCH", body: JSON.stringify(form) });
    else await api("/api/pos/customers", { method: "POST", body: JSON.stringify(form) });
    onSaved();
  }
  async function remove() {
    if (!customer || !confirm(`Delete ${customer.name}?`)) return;
    await api(`/api/pos/customers/${customer.id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-4">{customer ? customer.name : "New Customer"}</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-slate-400">Name</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Phone</label>
            <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Email</label>
            <input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Birthday</label>
            <input type="date" className={inputCls} value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Nationality</label>
            <input className={inputCls} value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Address</label>
            <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Dietary preferences</label>
            <input className={inputCls} value={form.dietary_preferences} onChange={(e) => setForm({ ...form, dietary_preferences: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Allergies</label>
            <input className={inputCls} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
          </div>
        </div>
        <label className="text-xs text-slate-400">Notes</label>
        <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

        {customer && (
          <div className="mt-4 flex gap-4 text-sm">
            <span className="text-amber-600 font-medium">{customer.loyalty_points} loyalty points</span>
            {Number(customer.credit_balance) > 0 && <span className="text-rose-500">Owes {Number(customer.credit_balance).toFixed(2)}</span>}
          </div>
        )}

        {customer?.orders && customer.orders.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-400 mb-1">Recent visits</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {customer.orders.map((o) => (
                <div key={o.id} className="flex justify-between text-xs text-slate-500">
                  <span>{o.order_number} · {new Date(o.created_at).toLocaleDateString()}</span>
                  <span>{Number(o.total_amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-5">
          {customer ? (
            <button onClick={remove} className="text-sm text-red-500 hover:underline">
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
              Cancel
            </button>
            <button onClick={save} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
