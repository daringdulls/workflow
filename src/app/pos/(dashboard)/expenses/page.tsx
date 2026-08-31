"use client";

import { useEffect, useState } from "react";
import { EXPENSE_CATEGORIES, Expense, Supplier, PAYMENT_METHODS, PAYMENT_METHOD_LABEL, PaymentMethod } from "@/lib/pos/types";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
  return res.json();
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [adding, setAdding] = useState(false);

  async function load() {
    const [e, s] = await Promise.all([api<Expense[]>("/api/pos/expenses"), api<Supplier[]>("/api/pos/suppliers")]);
    setExpenses(e);
    setSuppliers(s);
  }
  useEffect(() => {
    load();
  }, []);

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Expenses</h1>
          <p className="text-sm text-slate-400">Total logged: {total.toFixed(2)}</p>
        </div>
        <button onClick={() => setAdding(true)} className="text-sm px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
          + Add Expense
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Description</th>
              <th className="px-4 py-2.5">Payment</th>
              <th className="px-4 py-2.5">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-slate-50 dark:border-slate-800/60">
                <td className="px-4 py-2.5 text-slate-500">{new Date(e.expense_date).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{e.category}</td>
                <td className="px-4 py-2.5 text-slate-400">{e.description ?? "—"}</td>
                <td className="px-4 py-2.5 capitalize text-slate-500">{e.payment_method.replace("_", " ")}</td>
                <td className="px-4 py-2.5 font-medium">{Number(e.amount).toFixed(2)}</td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No expenses logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <AddExpenseModal
          suppliers={suppliers}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AddExpenseModal({ suppliers, onClose, onSaved }: { suppliers: Supplier[]; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const inputCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm";

  async function save() {
    await api("/api/pos/expenses", {
      method: "POST",
      body: JSON.stringify({ category, amount, payment_method: paymentMethod, supplier_id: supplierId || null, description, expense_date: date }),
    });
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-4">Add Expense</h2>
        <div className="space-y-3">
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input type="number" step="0.01" placeholder="Amount" className={inputCls} value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
          <select className={inputCls} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABEL[m]}
              </option>
            ))}
          </select>
          <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          <textarea placeholder="Description" rows={2} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
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
