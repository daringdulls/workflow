"use client";

import { useMemo, useState } from "react";
import { Profile } from "@/lib/types";
import { PROFILE_META } from "./ProfileTabs";

export interface CalItem {
  id: string;
  date: string; // ISO yyyy-mm-dd
  title: string;
  profile: Profile;
  kind: "task" | "design" | "freelance" | "event";
}

const DOT: Record<Profile, string> = {
  hotel: "bg-blue-500",
  design: "bg-purple-500",
  freelance: "bg-teal-500",
  general: "bg-slate-400",
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Calendar({
  items,
  scope,
  onAddEvent,
}: {
  items: CalItem[];
  scope: Profile | "all";
  onAddEvent: (title: string, date: string) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(toISODate(today));
  const [newTitle, setNewTitle] = useState("");

  const itemsByDate = useMemo(() => {
    const map: Record<string, CalItem[]> = {};
    for (const it of items) {
      if (scope !== "all" && it.profile !== scope) continue;
      (map[it.date] ??= []).push(it);
    }
    return map;
  }, [items, scope]);

  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddEvent(newTitle.trim(), selected);
    setNewTitle("");
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800">Calendar</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="h-7 w-7 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-slate-700 w-32 text-center">
            {cursor.toLocaleString("default", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="h-7 w-7 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {grid.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = toISODate(d);
          const dayItems = itemsByDate[iso] ?? [];
          const isToday = iso === toISODate(today);
          const isSelected = iso === selected;
          return (
            <button
              key={i}
              onClick={() => setSelected(iso)}
              className={`relative h-11 rounded-lg text-sm flex flex-col items-center justify-center gap-0.5 transition ${
                isSelected
                  ? "bg-slate-900 text-white"
                  : isToday
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              {d.getDate()}
              <span className="flex gap-0.5">
                {dayItems.slice(0, 3).map((it, idx) => (
                  <span key={idx} className={`h-1 w-1 rounded-full ${DOT[it.profile]}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-3">
        <p className="text-sm font-medium text-slate-700 mb-2">
          {new Date(selected + "T00:00:00").toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>
        <div className="space-y-1.5 mb-3">
          {(itemsByDate[selected] ?? []).length === 0 && (
            <p className="text-sm text-slate-400">Nothing scheduled.</p>
          )}
          {(itemsByDate[selected] ?? []).map((it) => (
            <div key={it.id} className="flex items-center gap-2 text-sm text-slate-700">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT[it.profile]}`} />
              <span>{it.title}</span>
              <span className="text-xs text-slate-400">
                ({PROFILE_META[it.profile]?.label ?? it.profile})
              </span>
            </div>
          ))}
        </div>
        <form onSubmit={addEvent} className="flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add note / meeting for this day…"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-sm">
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
