"use client";

import { useEffect, useState } from "react";
import { Reservation, RESERVATION_STATUSES, ReservationStatus, PosTable } from "@/lib/pos/types";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
  return res.json();
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_COLOR: Record<ReservationStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  confirmed: "bg-sky-100 text-sky-700",
  arrived: "bg-violet-100 text-violet-700",
  seated: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-400",
  cancelled: "bg-red-100 text-red-500",
  no_show: "bg-red-100 text-red-500",
};

export default function ReservationsPage() {
  const [date, setDate] = useState(todayISO());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<PosTable[]>([]);
  const [editing, setEditing] = useState<Reservation | "new" | null>(null);

  async function load() {
    const [r, t] = await Promise.all([api<Reservation[]>(`/api/pos/reservations?date=${date}`), api<PosTable[]>("/api/pos/tables")]);
    setReservations(r);
    setTables(t);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function setStatus(r: Reservation, status: ReservationStatus) {
    await api(`/api/pos/reservations/${r.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Reservations</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5" />
          <button onClick={() => setEditing("new")} className="text-sm px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
            + New Reservation
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {reservations.map((r) => (
          <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center gap-3 flex-wrap">
            <div className="w-16 shrink-0">
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{r.reservation_time}</p>
            </div>
            <div className="flex-1 min-w-[160px]">
              <button onClick={() => setEditing(r)} className="font-medium text-sm text-slate-800 dark:text-slate-100 hover:underline">
                {r.customer_name}
              </button>
              <p className="text-xs text-slate-400">
                {r.guests} guests {r.contact && `· ${r.contact}`} {r.occasion && `· ${r.occasion}`}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[r.status]}`}>{r.status.replace("_", " ")}</span>
            <select value={r.status} onChange={(e) => setStatus(r, e.target.value as ReservationStatus)} className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5">
              {RESERVATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        ))}
        {reservations.length === 0 && <p className="text-sm text-slate-400 py-10 text-center">No reservations for this date.</p>}
      </div>

      {editing && (
        <ReservationModal
          reservation={editing === "new" ? null : editing}
          tables={tables}
          defaultDate={date}
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

function ReservationModal({
  reservation,
  tables,
  defaultDate,
  onClose,
  onSaved,
}: {
  reservation: Reservation | null;
  tables: PosTable[];
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    customer_name: reservation?.customer_name ?? "",
    contact: reservation?.contact ?? "",
    reservation_date: reservation?.reservation_date?.slice(0, 10) ?? defaultDate,
    reservation_time: reservation?.reservation_time ?? "19:00",
    guests: reservation?.guests ?? 2,
    table_id: reservation?.table_id ?? "",
    special_requests: reservation?.special_requests ?? "",
    occasion: reservation?.occasion ?? "",
    deposit: reservation?.deposit ?? 0,
  });
  const inputCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm";

  async function save() {
    const payload = { ...form, table_id: form.table_id || null };
    if (reservation) await api(`/api/pos/reservations/${reservation.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    else await api("/api/pos/reservations", { method: "POST", body: JSON.stringify(payload) });
    onSaved();
  }
  async function remove() {
    if (!reservation || !confirm("Delete this reservation?")) return;
    await api(`/api/pos/reservations/${reservation.id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-4">{reservation ? "Edit Reservation" : "New Reservation"}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Customer name</label>
            <input className={inputCls} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Contact number</label>
            <input className={inputCls} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400">Date</label>
              <input type="date" className={inputCls} value={form.reservation_date} onChange={(e) => setForm({ ...form, reservation_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-400">Time</label>
              <input type="time" className={inputCls} value={form.reservation_time} onChange={(e) => setForm({ ...form, reservation_time: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-400">Guests</label>
              <input type="number" className={inputCls} value={form.guests} onChange={(e) => setForm({ ...form, guests: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Table (optional)</label>
            <select className={inputCls} value={form.table_id} onChange={(e) => setForm({ ...form, table_id: e.target.value ? Number(e.target.value) : "" })}>
              <option value="">Unassigned</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Occasion</label>
              <input className={inputCls} value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} placeholder="Birthday, anniversary…" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Deposit</label>
              <input type="number" step="0.01" className={inputCls} value={form.deposit} onChange={(e) => setForm({ ...form, deposit: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Special requests</label>
            <textarea className={inputCls} rows={2} value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-between mt-5">
          {reservation ? (
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
