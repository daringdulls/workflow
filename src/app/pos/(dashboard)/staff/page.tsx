"use client";

import { useEffect, useState } from "react";
import { PosStaff, ROLE_LABEL, STAFF_ROLES, StaffRole } from "@/lib/pos/types";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
  return res.json();
}

export default function StaffPage() {
  const [staff, setStaff] = useState<PosStaff[]>([]);
  const [editing, setEditing] = useState<PosStaff | "new" | null>(null);

  async function load() {
    setStaff(await api<PosStaff[]>("/api/pos/staff"));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Staff</h1>
        <button onClick={() => setEditing("new")} className="text-sm px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
          + Add Staff
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
        {staff.map((s) => (
          <button key={s.id} onClick={() => setEditing(s)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white text-xs font-semibold shrink-0">
              {s.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${s.active ? "text-slate-800 dark:text-slate-100" : "text-slate-400 line-through"}`}>{s.name}</p>
              <p className="text-xs text-slate-400">{ROLE_LABEL[s.role]}</p>
            </div>
            {!s.active && <span className="text-[10px] font-semibold text-red-400">INACTIVE</span>}
          </button>
        ))}
        {staff.length === 0 && <p className="px-4 py-10 text-center text-slate-400 text-sm">No staff yet.</p>}
      </div>

      {editing && (
        <StaffModal
          staff={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function StaffModal({ staff, onClose, onSaved }: { staff: PosStaff | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: staff?.name ?? "",
    role: staff?.role ?? ("waiter" as StaffRole),
    phone: staff?.phone ?? "",
    email: staff?.email ?? "",
    department: staff?.department ?? "",
    pin: "",
    active: staff?.active ?? true,
  });
  const inputCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm";

  async function save() {
    try {
      if (staff) {
        const payload: Record<string, unknown> = { ...form };
        if (!payload.pin) delete payload.pin;
        await api(`/api/pos/staff/${staff.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        if (!form.pin) {
          alert("PIN is required for a new staff member");
          return;
        }
        await api("/api/pos/staff", { method: "POST", body: JSON.stringify(form) });
      }
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-4">{staff ? "Edit Staff" : "New Staff"}</h2>
        <div className="space-y-3">
          <input placeholder="Full name" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Phone" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <input placeholder="Department" className={inputCls} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <input
            type="password"
            inputMode="numeric"
            placeholder={staff ? "Reset PIN (leave blank to keep)" : "4-6 digit PIN"}
            className={inputCls}
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value })}
          />
          {staff && (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
            </label>
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
