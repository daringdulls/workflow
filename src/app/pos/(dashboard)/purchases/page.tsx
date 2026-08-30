"use client";

import { useEffect, useState } from "react";
import { Ingredient, PurchaseOrder, Supplier } from "@/lib/pos/types";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
  return res.json();
}

export default function PurchasesPage() {
  const [tab, setTab] = useState<"orders" | "suppliers">("orders");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | "new" | null>(null);
  const [viewingPo, setViewingPo] = useState<PurchaseOrder | null>(null);

  async function load() {
    const [o, s, i] = await Promise.all([api<PurchaseOrder[]>("/api/pos/purchase-orders"), api<Supplier[]>("/api/pos/suppliers"), api<Ingredient[]>("/api/pos/ingredients")]);
    setOrders(o);
    setSuppliers(s);
    setIngredients(i);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Purchasing</h1>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1">
            <button onClick={() => setTab("orders")} className={`px-3 py-1.5 text-sm rounded-lg font-medium ${tab === "orders" ? "bg-orange-500 text-white" : "text-slate-500"}`}>
              Purchase Orders
            </button>
            <button onClick={() => setTab("suppliers")} className={`px-3 py-1.5 text-sm rounded-lg font-medium ${tab === "suppliers" ? "bg-orange-500 text-white" : "text-slate-500"}`}>
              Suppliers
            </button>
          </div>
          {tab === "orders" ? (
            <button onClick={() => setCreating(true)} className="text-sm px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
              + New Purchase Order
            </button>
          ) : (
            <button onClick={() => setEditingSupplier("new")} className="text-sm px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
              + Add Supplier
            </button>
          )}
        </div>
      </div>

      {tab === "orders" ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Supplier</th>
                <th className="px-4 py-2.5">Invoice #</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Payment</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-b border-slate-50 dark:border-slate-800/60">
                  <td className="px-4 py-2.5 text-slate-500">{new Date(po.order_date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{po.supplier_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-400">{po.invoice_number ?? "—"}</td>
                  <td className="px-4 py-2.5">{Number(po.total_amount).toFixed(2)}</td>
                  <td className="px-4 py-2.5 capitalize">{po.status}</td>
                  <td className="px-4 py-2.5 capitalize">{po.payment_status}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={async () => setViewingPo(await api<PurchaseOrder>(`/api/pos/purchase-orders/${po.id}`))}
                      className="text-xs text-orange-600 hover:underline"
                    >
                      {po.status === "received" ? "View" : "Receive"}
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No purchase orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suppliers.map((s) => (
            <button key={s.id} onClick={() => setEditingSupplier(s)} className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-md transition">
              <p className="font-medium text-slate-800 dark:text-slate-100">{s.name}</p>
              <p className="text-xs text-slate-400">{s.contact_person} {s.phone && `· ${s.phone}`}</p>
              {Number(s.balance) > 0 && <p className="text-xs text-rose-500 mt-1">Balance owed: {Number(s.balance).toFixed(2)}</p>}
            </button>
          ))}
          {suppliers.length === 0 && <p className="text-sm text-slate-400 col-span-full py-10 text-center">No suppliers yet.</p>}
        </div>
      )}

      {creating && (
        <CreatePoModal
          suppliers={suppliers}
          ingredients={ingredients}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}

      {editingSupplier && (
        <SupplierModal
          supplier={editingSupplier === "new" ? null : editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSaved={() => {
            setEditingSupplier(null);
            load();
          }}
        />
      )}

      {viewingPo && (
        <ReceivePoModal
          po={viewingPo}
          onClose={() => setViewingPo(null)}
          onReceived={() => {
            setViewingPo(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreatePoModal({
  suppliers,
  ingredients,
  onClose,
  onSaved,
}: {
  suppliers: Supplier[];
  ingredients: Ingredient[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [items, setItems] = useState<{ ingredient_id?: number; description: string; quantity: number; unit_cost: number }[]>([
    { description: "", quantity: 1, unit_cost: 0 },
  ]);
  const inputCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm";

  async function save() {
    await api("/api/pos/purchase-orders", {
      method: "POST",
      body: JSON.stringify({ supplier_id: supplierId || null, invoice_number: invoiceNumber || null, items: items.filter((i) => i.description) }),
    });
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-4">New Purchase Order</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input placeholder="Invoice #" className={inputCls} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </div>

        <p className="text-xs text-slate-400 mb-1.5">Items</p>
        <div className="space-y-2 mb-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <select
                className={`${inputCls} w-40`}
                value={item.ingredient_id ?? ""}
                onChange={(e) => {
                  const ing = ingredients.find((i) => i.id === Number(e.target.value));
                  const next = [...items];
                  next[idx] = { ...item, ingredient_id: ing?.id, description: ing?.name ?? item.description };
                  setItems(next);
                }}
              >
                <option value="">Custom item</option>
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Description"
                className={inputCls}
                value={item.description}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...item, description: e.target.value };
                  setItems(next);
                }}
              />
              <input
                type="number"
                step="0.001"
                placeholder="Qty"
                className={`${inputCls} w-20`}
                value={item.quantity}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...item, quantity: parseFloat(e.target.value) || 0 };
                  setItems(next);
                }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Unit cost"
                className={`${inputCls} w-24`}
                value={item.unit_cost}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...item, unit_cost: parseFloat(e.target.value) || 0 };
                  setItems(next);
                }}
              />
              <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 px-1">
                ×
              </button>
            </div>
          ))}
          <button onClick={() => setItems([...items, { description: "", quantity: 1, unit_cost: 0 }])} className="text-sm text-orange-600 hover:underline">
            + Add line
          </button>
        </div>

        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-4">
          Total: {items.reduce((s, i) => s + i.quantity * i.unit_cost, 0).toFixed(2)}
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            Cancel
          </button>
          <button onClick={save} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function SupplierModal({ supplier, onClose, onSaved }: { supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: supplier?.name ?? "",
    contact_person: supplier?.contact_person ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    address: supplier?.address ?? "",
    products_supplied: supplier?.products_supplied ?? "",
    payment_terms: supplier?.payment_terms ?? "",
  });
  const inputCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm";

  async function save() {
    if (supplier) await api(`/api/pos/suppliers/${supplier.id}`, { method: "PATCH", body: JSON.stringify(form) });
    else await api("/api/pos/suppliers", { method: "POST", body: JSON.stringify(form) });
    onSaved();
  }
  async function remove() {
    if (!supplier || !confirm(`Delete ${supplier.name}?`)) return;
    await api(`/api/pos/suppliers/${supplier.id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-4">{supplier ? "Edit Supplier" : "New Supplier"}</h2>
        <div className="space-y-3">
          <input placeholder="Supplier name" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Contact person" className={inputCls} value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Phone" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <input placeholder="Address" className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input placeholder="Products supplied" className={inputCls} value={form.products_supplied} onChange={(e) => setForm({ ...form, products_supplied: e.target.value })} />
          <input placeholder="Payment terms" className={inputCls} value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
        </div>
        <div className="flex justify-between mt-5">
          {supplier ? (
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

function ReceivePoModal({ po, onClose, onReceived }: { po: PurchaseOrder; onClose: () => void; onReceived: () => void }) {
  async function receive() {
    await api(`/api/pos/purchase-orders/${po.id}/receive`, { method: "POST", body: JSON.stringify({}) });
    onReceived();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-1">{po.supplier_name ?? "Purchase Order"}</h2>
        <p className="text-sm text-slate-400 mb-4">{po.status === "received" ? "Fully received" : "Not yet received"}</p>
        <div className="space-y-1.5 mb-4">
          {po.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className={item.received ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}>
                {item.description} × {item.quantity}
              </span>
              <span className="text-slate-500">{Number(item.total).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Total: {Number(po.total_amount).toFixed(2)}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            Close
          </button>
          {po.status !== "received" && (
            <button onClick={receive} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
              Mark all received
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
