"use client";

import { useState } from "react";
import {
  FreelanceProject,
  FreelanceStatus,
  Priority,
  PRIORITIES,
  PRIORITY_LABEL,
} from "@/lib/types";
import PriorityBadge from "./PriorityBadge";

const STATUS_LABEL: Record<FreelanceStatus, string> = {
  lead: "Lead",
  active: "Active",
  review: "In Review",
  delivered: "Delivered",
  paid: "Paid",
};

const STATUS_COLOR: Record<FreelanceStatus, string> = {
  lead: "bg-slate-100 text-slate-600",
  active: "bg-freelance-50 text-freelance-700",
  review: "bg-amber-50 text-amber-700",
  delivered: "bg-hotel-50 text-hotel-700",
  paid: "bg-emerald-50 text-emerald-700",
};

export default function FreelanceTracker({
  projects,
  onAdd,
  onUpdate,
  onDelete,
}: {
  projects: FreelanceProject[];
  onAdd: (p: {
    client_name: string;
    project_name: string;
    description: string;
    priority: Priority;
    deadline: string | null;
    rate: string;
  }) => void;
  onUpdate: (id: number, patch: Partial<FreelanceProject>) => void;
  onDelete: (id: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [client, setClient] = useState("");
  const [project, setProject] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [deadline, setDeadline] = useState("");
  const [rate, setRate] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!client.trim() || !project.trim()) return;
    onAdd({
      client_name: client.trim(),
      project_name: project.trim(),
      description: desc.trim(),
      priority,
      deadline: deadline || null,
      rate: rate.trim(),
    });
    setClient("");
    setProject("");
    setDesc("");
    setPriority("medium");
    setDeadline("");
    setRate("");
    setAdding(false);
  }

  const sorted = [...projects].sort((a, b) => {
    const order: FreelanceStatus[] = ["active", "review", "lead", "delivered", "paid"];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-freelance" />
          <h2 className="font-semibold text-slate-800">Freelance Projects</h2>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-sm font-medium text-white rounded-lg px-3 py-1.5 bg-freelance hover:bg-freelance-700 transition"
        >
          {adding ? "Cancel" : "+ New project"}
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="flex flex-wrap gap-2 mb-5 bg-slate-50 rounded-xl p-3 border border-slate-100">
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Client name"
            className="flex-1 min-w-[120px] rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
          />
          <input
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="Project name"
            className="flex-1 min-w-[120px] rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Scope / notes"
            className="flex-[2] min-w-[160px] rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white"
          />
          <input
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="Rate / budget"
            className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white"
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
          <button type="submit" className="rounded-lg bg-freelance hover:bg-freelance-700 text-white px-4 py-1.5 text-sm font-medium">
            Add
          </button>
        </form>
      )}

      <div className="space-y-2">
        {sorted.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-200 p-3 shadow-card hover:shadow-card-hover transition">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {p.project_name} <span className="text-slate-400 font-normal">· {p.client_name}</span>
                </p>
                {p.description && <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  {p.deadline && <span>Due {new Date(p.deadline).toLocaleDateString()}</span>}
                  {p.rate && <span>{p.rate}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={p.priority} />
                <select
                  value={p.status}
                  onChange={(e) => onUpdate(p.id, { status: e.target.value as FreelanceStatus })}
                  className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${STATUS_COLOR[p.status]}`}
                >
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <button onClick={() => onDelete(p.id)} className="text-slate-300 hover:text-red-500 text-sm">
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
        {sorted.length === 0 && <p className="text-sm text-slate-400">No freelance projects yet.</p>}
      </div>
    </div>
  );
}
