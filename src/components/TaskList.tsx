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

export default function TaskList({
  scope,
  tasks,
  onAdd,
  onUpdate,
  onDelete,
}: {
  scope: Profile | "all";
  tasks: Task[];
  onAdd: (t: { profile: Profile; title: string; due_date: string | null; priority: Priority }) => void;
  onUpdate: (id: number, patch: Partial<Task>) => void;
  onDelete: (id: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [profile, setProfile] = useState<Profile>(scope === "all" ? "hotel" : (scope as Profile));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      profile: scope === "all" ? profile : (scope as Profile),
      title: title.trim(),
      due_date: due || null,
      priority,
    });
    setTitle("");
    setDue("");
    setPriority("medium");
  }

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className={`h-2 w-2 rounded-full ${SCOPE_BTN[scope].split(" ")[0]}`} />
        <h2 className="font-semibold text-slate-800">Tasks</h2>
      </div>

      <form onSubmit={submit} className="flex flex-wrap gap-2 mb-5 bg-slate-50 rounded-xl p-3 border border-slate-100">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 min-w-[160px] rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
        />
        {scope === "all" && (
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as Profile)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white"
          >
            <option value="hotel">Hotel Ops</option>
            <option value="design">Graphic Design</option>
            <option value="freelance">Freelance</option>
            <option value="general">General</option>
          </select>
        )}
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>
        <button type="submit" className={`rounded-lg text-white px-4 py-1.5 text-sm font-medium transition ${SCOPE_BTN[scope]}`}>
          Add
        </button>
      </form>

      <div className="space-y-2">
        {open.length === 0 && (
          <p className="text-sm text-slate-400">No open tasks. Nice.</p>
        )}
        {open.map((t) => (
          <TaskRow key={t.id} task={t} scope={scope} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>

      {done.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-slate-400 cursor-pointer">
            {done.length} completed
          </summary>
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
        isDone ? "border-slate-100 bg-slate-50" : "border-slate-200 hover:shadow-card"
      }`}
    >
      <input
        type="checkbox"
        checked={isDone}
        onChange={() =>
          onUpdate(task.id, { status: isDone ? "todo" : "done" } as Partial<Task>)
        }
        className={`h-4 w-4 rounded ${PROFILE_DOT[task.profile].replace("bg-", "accent-")}`}
      />
      {scope === "all" && (
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${PROFILE_DOT[task.profile]}`}
          title={PROFILE_META[task.profile]?.label}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>
          {task.title}
        </p>
        {task.due_date && (
          <p className="text-xs text-slate-400">
            Due {new Date(task.due_date).toLocaleDateString()}
          </p>
        )}
      </div>
      <PriorityBadge priority={task.priority} />
      <button
        onClick={() => onDelete(task.id)}
        className="text-slate-300 hover:text-red-500 text-sm px-1"
        title="Delete"
      >
        ×
      </button>
    </div>
  );
}
