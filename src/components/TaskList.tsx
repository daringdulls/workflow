"use client";

import { useState } from "react";
import { Priority, Profile, Task, TaskStatus, PRIORITIES, PRIORITY_LABEL } from "@/lib/types";
import PriorityBadge from "./PriorityBadge";
import { PROFILE_META } from "./ProfileTabs";

const PROFILE_DOT: Record<Profile, string> = {
  hotel: "bg-hotel",
  design: "bg-design",
  freelance: "bg-freelance",
  general: "bg-slate-400",
};

const SCOPE_BTN: Record<Profile | "all", string> = {
  all: "bg-slate-900 hover:bg-slate-800",
  hotel: "bg-hotel hover:bg-hotel-700",
  design: "bg-design hover:bg-design-700",
  freelance: "bg-freelance hover:bg-freelance-700",
  general: "bg-slate-700 hover:bg-slate-800",
};

const SCOPE_TEXT: Record<Profile | "all", string> = {
  all: "text-slate-900 dark:text-slate-100",
  hotel: "text-hotel dark:text-hotel-400",
  design: "text-design dark:text-design-400",
  freelance: "text-freelance dark:text-freelance-400",
  general: "text-slate-700 dark:text-slate-300",
};

const HEADER_DOT: Record<Profile | "all", string> = {
  all: "bg-slate-400 dark:bg-slate-500",
  hotel: "bg-hotel",
  design: "bg-design",
  freelance: "bg-freelance",
  general: "bg-slate-500",
};

const VISIBLE_LIMIT = 6;

export default function TaskList({
  scope,
  tasks,
  onAdd,
  onUpdate,
  onDelete,
}: {
  scope: Profile | "all";
  tasks: Task[];
  onAdd: (t: {
    profile: Profile;
    title: string;
    due_date: string | null;
    priority: Priority;
    remind_at?: string | null;
  }) => void;
  onUpdate: (id: number, patch: Partial<Task>) => void;
  onDelete: (id: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [profile, setProfile] = useState<Profile>(scope === "all" ? "hotel" : (scope as Profile));
  const [showAll, setShowAll] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [remindAt, setRemindAt] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      profile: scope === "all" ? profile : (scope as Profile),
      title: title.trim(),
      due_date: due || null,
      priority,
      remind_at: remindAt ? new Date(remindAt).toISOString() : null,
    });
    setTitle("");
    setDue("");
    setPriority("medium");
    setRemindAt("");
    setShowReminder(false);
  }

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");
  const visibleOpen = showAll ? open : open.slice(0, VISIBLE_LIMIT);
  const inputCls =
    "rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${HEADER_DOT[scope]}`} />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Tasks</h2>
        </div>
        {open.length > VISIBLE_LIMIT && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className={`text-xs font-medium hover:underline ${SCOPE_TEXT[scope]}`}
          >
            {showAll ? "Show less" : "View all tasks"}
          </button>
        )}
      </div>

      <form
        onSubmit={submit}
        className="flex flex-wrap gap-2 mb-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          className={`flex-1 min-w-[160px] ${inputCls}`}
        />
        {scope === "all" && (
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as Profile)}
            className={`text-sm ${inputCls}`}
          >
            <option value="hotel">Hotel Ops</option>
            <option value="design">Graphic Design</option>
            <option value="freelance">Freelance</option>
            <option value="general">General</option>
          </select>
        )}
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
        <button
          type="button"
          onClick={() => setShowReminder((v) => !v)}
          title="Add a reminder"
          className={`text-sm px-2.5 py-1.5 rounded-lg border transition ${
            showReminder || remindAt
              ? "border-design bg-design-50 dark:bg-design/15 text-design dark:text-design-400"
              : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300"
          }`}
        >
          🔔
        </button>
        {showReminder && (
          <input
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            className={`text-sm ${inputCls}`}
          />
        )}
        <button type="submit" className={`rounded-lg text-white px-4 py-1.5 text-sm font-medium transition ${SCOPE_BTN[scope]}`}>
          Add Task
        </button>
      </form>

      <div className="space-y-2">
        {open.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No open tasks yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">You&apos;re all caught up!</p>
          </div>
        )}
        {visibleOpen.map((t) => (
          <TaskRow key={t.id} task={t} scope={scope} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>

      {done.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-slate-400 dark:text-slate-500 cursor-pointer">{done.length} completed</summary>
          <div className="space-y-2 mt-2">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} scope={scope} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TaskRow({
  task,
  scope,
  onUpdate,
  onDelete,
}: {
  task: Task;
  scope: Profile | "all";
  onUpdate: (id: number, patch: Partial<Task>) => void;
  onDelete: (id: number) => void;
}) {
  const isDone = task.status === "done";
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        isDone
          ? "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
          : "border-slate-200 dark:border-slate-800 hover:shadow-card"
      }`}
    >
      <input
        type="checkbox"
        checked={isDone}
        onChange={() => onUpdate(task.id, { status: isDone ? "todo" : "done" } as Partial<Task>)}
        className={`h-4 w-4 rounded ${PROFILE_DOT[task.profile].replace("bg-", "accent-")}`}
      />
      {scope === "all" && (
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${PROFILE_DOT[task.profile]}`}
          title={PROFILE_META[task.profile]?.label}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isDone ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-100"}`}>
          {task.title}
        </p>
        {(task.due_date || task.remind_at) && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {task.due_date && <>Due {new Date(task.due_date).toLocaleDateString()}</>}
            {task.due_date && task.remind_at && " · "}
            {task.remind_at && <>🔔 {new Date(task.remind_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</>}
          </p>
        )}
      </div>
      <PriorityBadge priority={task.priority} />
      <button onClick={() => onDelete(task.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 text-sm px-1" title="Delete">
        ×
      </button>
    </div>
  );
}
