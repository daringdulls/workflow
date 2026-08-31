"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DiningArea, TABLE_STATUS_COLOR, TABLE_STATUS_LABEL, TableStatus, TABLE_STATUSES } from "@/lib/pos/types";

interface TableRow {
  id: number;
  outlet_id: number;
  area_id: number | null;
  area_name: string | null;
  name: string;
  capacity: number;
  pos_x: number;
  pos_y: number;
  status: TableStatus;
  order_id: number | null;
  order_number: string | null;
  order_total: string | null;
  order_guest_count: number | null;
  order_started_at: string | null;
  waiter_name: string | null;
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
  return res.json();
}

export default function TablesPage() {
  const router = useRouter();
  const [areas, setAreas] = useState<DiningArea[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [activeArea, setActiveArea] = useState<number | "all">("all");
  const [selected, setSelected] = useState<TableRow | null>(null);
  const [newAreaName, setNewAreaName] = useState("");
  const [addingTable, setAddingTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCap, setNewTableCap] = useState(4);

  async function load() {
    const [a, t] = await Promise.all([api<DiningArea[]>("/api/pos/areas"), api<TableRow[]>("/api/pos/tables")]);
    setAreas(a);
    setTables(t);
  }
  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function addArea() {
    if (!newAreaName.trim()) return;
    const a = await api<DiningArea>("/api/pos/areas", { method: "POST", body: JSON.stringify({ name: newAreaName.trim(), sort_order: areas.length }) });
    setAreas((p) => [...p, a]);
    setNewAreaName("");
  }

  async function addTable() {
    if (!newTableName.trim()) return;
    const areaId = activeArea === "all" ? areas[0]?.id ?? null : activeArea;
    const t = await api<TableRow>("/api/pos/tables", {
      method: "POST",
      body: JSON.stringify({ name: newTableName.trim(), capacity: newTableCap, area_id: areaId, pos_x: 20, pos_y: 20 }),
    });
    setTables((p) => [...p, { ...t, area_name: areas.find((a) => a.id === areaId)?.name ?? null, order_id: null, order_number: null, order_total: null, order_guest_count: null, order_started_at: null, waiter_name: null }]);
    setNewTableName("");
    setAddingTable(false);
  }

  async function setStatus(table: TableRow, status: TableStatus) {
    await api(`/api/pos/tables/${table.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    setTables((p) => p.map((t) => (t.id === table.id ? { ...t, status } : t)));
    setSelected((s) => (s && s.id === table.id ? { ...s, status } : s));
  }

  const visible = activeArea === "all" ? tables : tables.filter((t) => t.area_id === activeArea);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Table Management</h1>
        <div className="flex items-center gap-2">
          <input
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addArea()}
            placeholder="New dining area"
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
          />
          <button onClick={addArea} className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 text-white">
            Add area
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveArea("all")}
          className={`px-3 py-1.5 rounded-full text-sm ${activeArea === "all" ? "bg-orange-500 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
        >
          All areas
        </button>
        {areas.map((a) => (
          <button
            key={a.id}
            onClick={() => setActiveArea(a.id)}
            className={`px-3 py-1.5 rounded-full text-sm ${activeArea === a.id ? "bg-orange-500 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
          >
            {a.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        {TABLE_STATUSES.map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`h-2.5 w-2.5 rounded-full border ${TABLE_STATUS_COLOR[s]}`} />
            {TABLE_STATUS_LABEL[s]}
          </div>
        ))}
      </div>

      <FloorCanvas tables={visible} onSelect={setSelected} />

      <div className="mt-4">
        {addingTable ? (
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 w-fit">
            <input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="Table name" className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 w-28" />
            <input type="number" value={newTableCap} onChange={(e) => setNewTableCap(parseInt(e.target.value) || 1)} className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 w-20" title="Capacity" />
            <button onClick={addTable} className="text-sm px-3 py-1.5 rounded-lg bg-orange-500 text-white">
              Add
            </button>
            <button onClick={() => setAddingTable(false)} className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setAddingTable(true)} className="text-sm px-3.5 py-2 rounded-lg bg-slate-800 text-white font-medium">
            + Add Table
          </button>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Table {selected.name}</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 text-xl">
                ×
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              {selected.area_name ?? "No area"} · Seats {selected.capacity}
            </p>

            {selected.order_id ? (
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 mb-4 text-sm">
                <p className="font-medium text-slate-700 dark:text-slate-200">Order {selected.order_number}</p>
                <p className="text-slate-500">
                  {selected.order_guest_count} guests · {selected.waiter_name ?? "unassigned"} ·{" "}
                  {selected.order_started_at && new Date(selected.order_started_at).toLocaleTimeString()}
                </p>
                <p className="font-semibold mt-1 text-slate-800 dark:text-slate-100">{Number(selected.order_total).toFixed(2)}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400 mb-4">No open order</p>
            )}

            <p className="text-xs text-slate-400 mb-1.5">Set status</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {TABLE_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(selected, s)}
                  className={`text-xs px-2.5 py-2 rounded-lg border ${selected.status === s ? TABLE_STATUS_COLOR[s] : "border-slate-200 dark:border-slate-700 text-slate-500"}`}
                >
                  {TABLE_STATUS_LABEL[s]}
                </button>
              ))}
            </div>

            <button
              onClick={() => router.push(`/pos/order?table=${selected.id}`)}
              className="w-full text-sm px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium"
            >
              {selected.order_id ? "Open order" : "Start new order"}
            </button>

            <button
              onClick={() => {
                const url = `${window.location.origin}/menu/${selected.id}`;
                navigator.clipboard?.writeText(url);
                alert(`Guest QR menu link copied:\n${url}`);
              }}
              className="w-full text-xs px-4 py-2 mt-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500"
            >
              Copy guest QR menu link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FloorCanvas({ tables, onSelect }: { tables: TableRow[]; onSelect: (t: TableRow) => void }) {
  const [positions, setPositions] = useState<Record<number, { x: number; y: number }>>({});
  const dragState = useRef<{ id: number; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  useEffect(() => {
    const next: Record<number, { x: number; y: number }> = {};
    for (const t of tables) next[t.id] = { x: t.pos_x, y: t.pos_y };
    setPositions(next);
  }, [tables]);

  function onPointerDown(e: React.PointerEvent, t: TableRow) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { id: t.id, startX: e.clientX, startY: e.clientY, origX: positions[t.id]?.x ?? t.pos_x, origY: positions[t.id]?.y ?? t.pos_y, moved: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragState.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    setPositions((p) => ({ ...p, [d.id]: { x: Math.max(0, d.origX + dx), y: Math.max(0, d.origY + dy) } }));
  }
  async function onPointerUp(t: TableRow) {
    const d = dragState.current;
    dragState.current = null;
    if (!d) return;
    if (d.moved) {
      const pos = positions[t.id];
      if (pos) await api(`/api/pos/tables/${t.id}`, { method: "PATCH", body: JSON.stringify({ pos_x: Math.round(pos.x), pos_y: Math.round(pos.y) }) });
    } else {
      onSelect(t);
    }
  }

  return (
    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl h-[520px] overflow-auto">
      {tables.map((t) => {
        const pos = positions[t.id] ?? { x: t.pos_x, y: t.pos_y };
        return (
          <div
            key={t.id}
            onPointerDown={(e) => onPointerDown(e, t)}
            onPointerMove={onPointerMove}
            onPointerUp={() => onPointerUp(t)}
            style={{ left: pos.x, top: pos.y }}
            className={`absolute cursor-grab active:cursor-grabbing select-none flex flex-col items-center justify-center h-24 w-24 rounded-2xl border-2 shadow-sm ${TABLE_STATUS_COLOR[t.status]}`}
          >
            <p className="font-semibold text-sm">{t.name}</p>
            <p className="text-[11px]">Seats {t.capacity}</p>
            {t.order_total && <p className="text-[11px] font-medium">{Number(t.order_total).toFixed(2)}</p>}
          </div>
        );
      })}
      {tables.length === 0 && <p className="text-sm text-slate-400 p-6">No tables in this area yet.</p>}
    </div>
  );
}
