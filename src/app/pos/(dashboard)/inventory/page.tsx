"use client";

import { useEffect, useState } from "react";
import { Ingredient, Supplier, WASTAGE_REASONS, STOCK_MOVEMENT_TYPES, StockMovementType, PosStaff, ROLE_PERMISSIONS } from "@/lib/pos/types";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
  return res.json();
}

interface Movement {
  id: number;
  ingredient_name: string;
  unit: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  staff_name: string | null;
  created_at: string;
}

export default function InventoryPage() {
  const [tab, setTab] = useState<"stock" | "movements">("stock");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [staff, setStaff] = useState<PosStaff[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [editing, setEditing] = useState<Ingredient | "new" | null>(null);
  const [wasteFor, setWasteFor] = useState<Ingredient | null>(null);

  async function load() {
    const [i, s, st] = await Promise.all([api<Ingredient[]>("/api/pos/ingredients"), api<Supplier[]>("/api/pos/suppliers"), api<PosStaff[]>("/api/pos/staff")]);
    setIngredients(i);
    setSuppliers(s);
    setStaff(st.filter((x) => x.active));
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (tab === "movements") api<Movement[]>("/api/pos/stock-movements").then(setMovements);
  }, [tab]);

  const lowStock = ingredients.filter((i) => Number(i.stock_qty) <= Number(i.reorder_level));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Inventory</h1>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1">
            <button onClick={() => setTab("stock")} className={`px-3 py-1.5 text-sm rounded-lg font-medium ${tab === "stock" ? "bg-orange-500 text-white" : "text-slate-500"}`}>
              Stock
            </button>
            <button onClick={() => setTab("movements")} className={`px-3 py-1.5 text-sm rounded-lg font-medium ${tab === "movements" ? "bg-orange-500 text-white" : "text-slate-500"}`}>
              Movements
            </button>
          </div>
          <button onClick={() => setEditing("new")} className="text-sm px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
            + Add Ingredient
          </button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-900 rounded-xl p-3 mb-4 text-sm text-amber-700 dark:text-amber-400">
          ⚠️ {lowStock.length} ingredient{lowStock.length > 1 ? "s" : ""} at or below reorder level: {lowStock.map((i) => i.name).join(", ")}
        </div>
      )}

      {tab === "stock" ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2.5">Ingredient</th>
                <th className="px-4 py-2.5">Stock</th>
                <th className="px-4 py-2.5">Reorder level</th>
                <th className="px-4 py-2.5">Cost / unit</th>
                <th className="px-4 py-2.5">Expiry</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((i) => {
                const low = Number(i.stock_qty) <= Number(i.reorder_level);
                return (
                  <tr key={i.id} className="border-b border-slate-50 dark:border-slate-800/60">
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{i.name}</td>
                    <td className={`px-4 py-2.5 ${low ? "text-red-500 font-semibold" : "text-slate-600 dark:text-slate-300"}`}>
                      {i.stock_qty} {i.unit}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{i.reorder_level} {i.unit}</td>
                    <td className="px-4 py-2.5 text-slate-500">{Number(i.cost_per_unit).toFixed(3)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{i.expiry_date ? new Date(i.expiry_date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => setWasteFor(i)} className="text-xs text-amber-600 hover:underline mr-3">
                        Log waste
                      </button>
                      <button onClick={() => setEditing(i)} className="text-xs text-orange-600 hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {ingredients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No ingredients yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Ingredient</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Qty</th>
                <th className="px-4 py-2.5">Reason</th>
                <th className="px-4 py-2.5">By</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-slate-50 dark:border-slate-800/60">
                  <td className="px-4 py-2.5 text-slate-400">{new Date(m.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{m.ingredient_name}</td>
                  <td className="px-4 py-2.5 capitalize text-slate-500">{m.type}</td>
                  <td className={`px-4 py-2.5 ${Number(m.quantity) < 0 ? "text-red-500" : "text-emerald-600"}`}>
                    {Number(m.quantity) > 0 ? "+" : ""}
                    {m.quantity} {m.unit}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{m.reason ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-400">{m.staff_name ?? "—"}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No stock movements yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <IngredientModal
          ingredient={editing === "new" ? null : editing}
          suppliers={suppliers}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {wasteFor && (
        <WasteModal
          ingredient={wasteFor}
          staff={staff}
          onClose={() => setWasteFor(null)}
          onSaved={() => {
            setWasteFor(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function IngredientModal({ ingredient, suppliers, onClose, onSaved }: { ingredient: Ingredient | null; suppliers: Supplier[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: ingredient?.name ?? "",
    unit: ingredient?.unit ?? "g",
    stock_qty: ingredient?.stock_qty ?? 0,
    reorder_level: ingredient?.reorder_level ?? 0,
    cost_per_unit: ingredient?.cost_per_unit ?? 0,
    supplier_id: ingredient?.supplier_id ?? "",
    expiry_date: ingredient?.expiry_date?.slice(0, 10) ?? "",
    batch_number: ingredient?.batch_number ?? "",
  });
  const inputCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm";

  async function save() {
    const payload = { ...form, supplier_id: form.supplier_id || null, expiry_date: form.expiry_date || null };
    if (ingredient) await api(`/api/pos/ingredients/${ingredient.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    else await api("/api/pos/ingredients", { method: "POST", body: JSON.stringify(payload) });
    onSaved();
  }
  async function remove() {
    if (!ingredient || !confirm(`Delete ${ingredient.name}?`)) return;
    await api(`/api/pos/ingredients/${ingredient.id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-4">{ingredient ? "Edit Ingredient" : "New Ingredient"}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Name</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Unit</label>
              <input className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="g, ml, pcs…" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Cost per unit</label>
              <input type="number" step="0.0001" className={inputCls} value={form.cost_per_unit} onChange={(e) => setForm({ ...form, cost_per_unit: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Current stock</label>
              <input type="number" step="0.001" className={inputCls} value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-slate-400">Reorder level</label>
              <input type="number" step="0.001" className={inputCls} value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Supplier</label>
            <select className={inputCls} value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value ? Number(e.target.value) : "" })}>
              <option value="">None</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Expiry date</label>
              <input type="date" className={inputCls} value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-400">Batch number</label>
              <input className={inputCls} value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="flex justify-between mt-5">
          {ingredient ? (
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

function WasteModal({ ingredient, staff, onClose, onSaved }: { ingredient: Ingredient; staff: PosStaff[]; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<StockMovementType>("waste");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState(WASTAGE_REASONS[0]);
  const [department, setDepartment] = useState("Kitchen");
  const approvers = staff.filter((s) => ROLE_PERMISSIONS[s.role]?.voidsRefunds);
  const [approverId, setApproverId] = useState(approvers[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const estimatedCost = quantity * Number(ingredient.cost_per_unit);
  const needsApproval = type === "waste" && estimatedCost > 5;
  const inputCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm";

  async function save() {
    try {
      await api("/api/pos/stock-movements", {
        method: "POST",
        body: JSON.stringify({
          ingredient_id: ingredient.id,
          type,
          quantity,
          reason,
          department,
          approved_by: needsApproval ? approverId : undefined,
          approval_pin: needsApproval ? pin : undefined,
        }),
      });
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-1">Log Stock Movement</h2>
        <p className="text-sm text-slate-400 mb-4">{ingredient.name}</p>
        <div className="space-y-3">
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as StockMovementType)}>
            {STOCK_MOVEMENT_TYPES.filter((t) => t !== "sale" && t !== "purchase").map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input type="number" step="0.001" placeholder={`Quantity (${ingredient.unit})`} className={inputCls} value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} />
          {type === "waste" ? (
            <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
              {WASTAGE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          ) : (
            <input placeholder="Reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} />
          )}
          <input placeholder="Department" className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)} />

          {needsApproval && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-xs text-amber-600 mb-2">Waste over 5.00 in value needs manager approval.</p>
              <select className={inputCls} value={approverId} onChange={(e) => setApproverId(Number(e.target.value))}>
                {approvers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input type="password" inputMode="numeric" placeholder="Manager PIN" className={`${inputCls} mt-2`} value={pin} onChange={(e) => setPin(e.target.value)} />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            Cancel
          </button>
          <button onClick={save} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
