"use client";

import { useEffect, useMemo, useState } from "react";
import { KITCHEN_STATIONS, ItemStatus } from "@/lib/pos/types";

interface Ticket {
  id: number;
  order_id: number;
  order_number: string;
  order_type: string;
  table_name: string | null;
  name_snapshot: string;
  quantity: number;
  modifiers: { option: string }[];
  notes: string | null;
  kitchen_notes: string | null;
  station: string;
  status: ItemStatus;
  sent_at: string;
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
  return res.json();
}

const NEXT_STATUS: Record<ItemStatus, ItemStatus | null> = {
  new: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "served",
  served: null,
  cancelled: null,
};
const ACTION_LABEL: Record<ItemStatus, string> = {
  new: "Accept",
  accepted: "Start Preparing",
  preparing: "Mark Ready",
  ready: "Mark Served",
  served: "",
  cancelled: "",
};

export default function KitchenPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [station, setStation] = useState<string>("all");
  const [now, setNow] = useState(Date.now());

  async function load() {
    const rows = await api<Ticket[]>("/api/pos/kitchen");
    setTickets(rows);
  }
  useEffect(() => {
    load();
    const dataInterval = setInterval(load, 8000);
    const clock = setInterval(() => setNow(Date.now()), 15000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clock);
    };
  }, []);

  async function advance(ticket: Ticket) {
    const next = NEXT_STATUS[ticket.status];
    if (!next) return;
    setTickets((p) => p.map((t) => (t.id === ticket.id ? { ...t, status: next } : t)));
    await api(`/api/pos/kitchen/items/${ticket.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    load();
  }

  const stationsPresent = useMemo(() => {
    const set = new Set(tickets.map((t) => t.station));
    return KITCHEN_STATIONS.filter((s) => set.has(s));
  }, [tickets]);

  const filtered = station === "all" ? tickets : tickets.filter((t) => t.station === station);
  const grouped = useMemo(() => {
    const byOrder = new Map<string, Ticket[]>();
    for (const t of filtered) {
      const key = t.order_number;
      if (!byOrder.has(key)) byOrder.set(key, []);
      byOrder.get(key)!.push(t);
    }
    return Array.from(byOrder.entries());
  }, [filtered]);

  return (
    <div className="p-5 min-h-screen bg-slate-950">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-white">Kitchen Display</h1>
        <div className="text-xs text-slate-500">{tickets.length} active items</div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setStation("all")} className={`px-3 py-1.5 rounded-full text-sm ${station === "all" ? "bg-orange-500 text-white" : "bg-slate-900 text-slate-300 border border-slate-800"}`}>
          All stations
        </button>
        {stationsPresent.map((s) => (
          <button key={s} onClick={() => setStation(s)} className={`px-3 py-1.5 rounded-full text-sm ${station === s ? "bg-orange-500 text-white" : "bg-slate-900 text-slate-300 border border-slate-800"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {grouped.map(([orderNumber, group]) => {
          const oldestSent = Math.min(...group.map((t) => new Date(t.sent_at).getTime()));
          const elapsedMin = Math.floor((now - oldestSent) / 60000);
          const delayed = elapsedMin >= 20;
          const warn = elapsedMin >= 10 && !delayed;
          return (
            <div key={orderNumber} className={`rounded-2xl border-2 p-4 bg-slate-900 ${delayed ? "border-red-500" : warn ? "border-amber-500" : "border-slate-800"}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-white">{orderNumber}</p>
                  <p className="text-xs text-slate-500">
                    {group[0].order_type.replace(/_/g, " ")} {group[0].table_name && `· Table ${group[0].table_name}`}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${delayed ? "bg-red-500/20 text-red-400" : warn ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400"}`}>
                  {elapsedMin}m
                </span>
              </div>
              <div className="space-y-2.5">
                {group.map((t) => (
                  <div key={t.id} className="border-t border-slate-800 pt-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm text-white font-medium">
                          {t.quantity}× {t.name_snapshot}
                        </p>
                        {t.modifiers?.length > 0 && <p className="text-xs text-slate-400">{t.modifiers.map((m) => m.option).join(", ")}</p>}
                        {(t.notes || t.kitchen_notes) && <p className="text-xs text-amber-400 italic">{t.kitchen_notes || t.notes}</p>}
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 shrink-0">{t.status}</span>
                    </div>
                    {NEXT_STATUS[t.status] && (
                      <button onClick={() => advance(t)} className="mt-2 w-full text-xs px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
                        {ACTION_LABEL[t.status]}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {grouped.length === 0 && <p className="text-slate-500 text-sm col-span-full py-16 text-center">No active kitchen tickets.</p>}
      </div>
    </div>
  );
}
