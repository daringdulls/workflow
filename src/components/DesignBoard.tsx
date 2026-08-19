"use client";

import { useState } from "react";
import { DesignOrder, DesignStatus, Priority, PRIORITIES, PRIORITY_LABEL } from "@/lib/types";
import PriorityBadge from "./PriorityBadge";

const COLUMNS: { key: DesignStatus; label: string; dot: string }[] = [
  { key: "new", label: "New", dot: "bg-slate-400" },
  { key: "in_progress", label: "In Progress", dot: "bg-design" },
  { key: "review", label: "Review", dot: "bg-amber-500" },
  { key: "delivered", label: "Delivered", dot: "bg-emerald-500" },
];

export default function DesignBoard({
  orders,
  onAdd,
  onUpdate,
  onDelete,
}: {
  orders: DesignOrder[];
  onAdd: (o: {
    client_name: string;
    description: string;
    priority: Priority;
    due_date: string | null;
  }) => void;
  onUpdate: (id: number, patch: Partial<DesignOrder>) => void;
  onDelete: (id: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [client, setClient] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState("");
  const inputCls =
    "rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!client.trim()) return;
    onAdd({ client_name: client.trim(), description: desc.trim(), priority, due_date: due || null });
    setClient("");
    setDesc("");
    setPriority("medium");
    setDue("");
    setAdding(false);
  }

  function move(order: DesignOrder, dir: 1 | -1) {
    const idx = COLUMNS.findIndex((c) => c.key === order.status);
    const next = COLUMNS[idx + dir];
    if (next) onUpdate(order.id, { status: next.key });
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-design" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Design Requests</h2>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-sm font-medium text-white rounded-lg px-3 py-1.5 bg-design hover:bg-design-700 transition"
        >
          {adding ? "Cancel" : "+ New order"}
        </button>
      </div>

      {adding && (
        <form
          onSubmit={submit}
          className="flex flex-wrap gap-2 mb-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800"
        >
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Client / brand name"
            className={`flex-1 min-w-[140px] ${inputCls}`}
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What do they need?"
            className={`flex-[2] min-w-[180px] ${inputCls}`}
          />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`text-sm ${inputCls}`} />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className={`text-sm ${inputCls}`}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-design hover:bg-design-700 text-white px-4 py-1.5 text-sm font-medium">
            Add
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.key);
          return (
            <div key={col.key} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                  {col.label}
                </span>
                <span className="text-slate-400 dark:text-slate-500">{colOrders.length}</span>
              </p>
              <div className="space-y-2">
                {colOrders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3 shadow-card hover:shadow-card-hover transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{o.client_name}</p>
                      <PriorityBadge priority={o.priority} />
                    </div>
                    {o.description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{o.description}</p>}
                    {o.due_date && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                        Due {new Date(o.due_date).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <button
                          disabled={col.key === "new"}
                          onClick={() => move(o, -1)}
                          className="text-xs px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          disabled={col.key === "delivered"}
                          onClick={() => move(o, 1)}
                          className="text-xs px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30"
                        >
                          →
                        </button>
                      </div>
                      <button onClick={() => onDelete(o.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 text-sm">
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                {colOrders.length === 0 && <p className="text-xs text-slate-300 dark:text-slate-600 text-center py-4">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
