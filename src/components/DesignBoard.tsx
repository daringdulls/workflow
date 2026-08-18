"use client";

import { useState } from "react";
import { DesignOrder, DesignStatus, Priority, PRIORITIES, PRIORITY_LABEL } from "@/lib/types";
import PriorityBadge from "./PriorityBadge";

const COLUMNS: { key: DesignStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "delivered", label: "Delivered" },
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
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800">Design Requests</h2>
        <button onClick={() => setAdding((v) => !v)} className="text-sm text-slate-500 hover:text-slate-800">
          {adding ? "Cancel" : "+ New order"}
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="flex flex-wrap gap-2 mb-5">
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Client / brand name"
            className="flex-1 min-w-[140px] rounded-lg border border-slate-200 px-3 py-1.5"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What do they need?"
            className="flex-[2] min-w-[180px] rounded-lg border border-slate-200 px-3 py-1.5"
          />
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-purple-600 text-white px-4 py-1.5 text-sm">
            Add
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.key);
          return (
            <div key={col.key} className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center justify-between">
                {col.label}
                <span className="text-slate-400">{colOrders.length}</span>
              </p>
              <div className="space-y-2">
                {colOrders.map((o) => (
                  <div key={o.id} className="bg-white rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-slate-800">{o.client_name}</p>
                      <PriorityBadge priority={o.priority} />
                    </div>
                    {o.description && (
                      <p className="text-xs text-slate-500 mb-2">{o.description}</p>
                    )}
                    {o.due_date && (
                      <p className="text-xs text-slate-400 mb-2">
                        Due {new Date(o.due_date).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <button
                          disabled={col.key === "new"}
                          onClick={() => move(o, -1)}
                          className="text-xs px-1.5 py-0.5 rounded border border-slate-200 disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          disabled={col.key === "delivered"}
                          onClick={() => move(o, 1)}
                          className="text-xs px-1.5 py-0.5 rounded border border-slate-200 disabled:opacity-30"
                        >
                          →
                        </button>
                      </div>
                      <button
                        onClick={() => onDelete(o.id)}
                        className="text-slate-300 hover:text-red-500 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                {colOrders.length === 0 && (
                  <p className="text-xs text-slate-300 text-center py-4">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
