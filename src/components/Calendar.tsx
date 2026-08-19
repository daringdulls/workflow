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
  hotel: "bg-hotel",
  design: "bg-design",
  freelance: "bg-freelance",
  general: "bg-slate-400",
};

const SCOPE_ACCENT: Record<Profile | "all", string> = {
  all: "bg-slate-900 dark:bg-slate-100 dark:text-slate-900",
  hotel: "bg-hotel",
  design: "bg-design",
  freelance: "bg-freelance",
  general: "bg-slate-700",
};

const HEADER_DOT: Record<Profile | "all", string> = {
  all: "bg-slate-400 dark:bg-slate-500",
  hotel: "bg-hotel",
  design: "bg-design",
  freelance: "bg-freelance",
  general: "bg-slate-500",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface DayCell {
  date: Date;
  inMonth: boolean;
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
    const prevMonthDays = new Date(year, month, 0).getDate();
    const cells: DayCell[] = [];
    for (let i = startOffset; i > 0; i--) {
      cells.push({ date: new Date(year, month - 1, prevMonthDays - i + 1), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ date: new Date(year, month + 1, nextDay), inMonth: false });
      nextDay++;
    }
    return cells;
  }, [cursor]);

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const baseYear = today.getFullYear();
    for (let y = baseYear - 1; y <= baseYear + 1; y++) {
      for (let m = 0; m < 12; m++) {
        opts.push({ value: `${y}-${m}`, label: `${MONTH_NAMES[m]} ${y}` });
      }
    }
    return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(toISODate(today));
  }

  function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddEvent(newTitle.trim(), selected);
    setNewTitle("");
  }

  const selectCls =
    "text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-hotel-400";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${HEADER_DOT[scope]}`} />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Calendar</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="h-7 w-7 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            ‹
          </button>
          <button
            onClick={goToToday}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Today
          </button>
          <select
            value={`${cursor.getFullYear()}-${cursor.getMonth()}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setCursor(new Date(y, m, 1));
            }}
            className={selectCls}
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="h-7 w-7 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 dark:text-slate-500 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {grid.map((cell, i) => {
          const iso = toISODate(cell.date);
          const dayItems = itemsByDate[iso] ?? [];
          const isToday = iso === toISODate(today);
          const isSelected = iso === selected;

          if (!cell.inMonth) {
            return (
              <div
                key={i}
                className="h-11 rounded-lg text-sm flex items-center justify-center text-slate-300 dark:text-slate-700"
              >
                {cell.date.getDate()}
              </div>
            );
          }

          return (
            <button
              key={i}
              onClick={() => setSelected(iso)}
              className={`relative h-11 rounded-full text-sm flex flex-col items-center justify-center gap-0.5 transition ${
                isSelected
                  ? `${SCOPE_ACCENT[scope]} text-white shadow-card`
                  : isToday
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold ring-1 ring-slate-300 dark:ring-slate-600"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              {cell.date.getDate()}
              <span className="flex gap-0.5">
                {dayItems.slice(0, 3).map((it, idx) => (
                  <span key={idx} className={`h-1 w-1 rounded-full ${isSelected ? "bg-white/80" : DOT[it.profile]}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          {new Date(selected + "T00:00:00").toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>
        <div className="space-y-1.5 mb-3">
          {(itemsByDate[selected] ?? []).length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">Nothing scheduled.</p>
          )}
          {(itemsByDate[selected] ?? []).map((it) => (
            <div key={it.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT[it.profile]}`} />
              <span>{it.title}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
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
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
          <button type="submit" className={`rounded-lg text-white px-3 py-1.5 text-sm font-medium ${SCOPE_ACCENT[scope]}`}>
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
