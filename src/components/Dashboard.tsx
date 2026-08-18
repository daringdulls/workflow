"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppLink,
  DesignOrder,
  FreelanceProject,
  Profile,
  Task,
  CalEvent,
} from "@/lib/types";
import ProfileTabs, { PROFILE_META } from "./ProfileTabs";
import AppLauncher from "./AppLauncher";
import TaskList from "./TaskList";
import Calendar, { CalItem } from "./Calendar";
import DesignBoard from "./DesignBoard";
import FreelanceTracker from "./FreelanceTracker";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return res.json();
}

export default function Dashboard() {
  const router = useRouter();
  const [scope, setScope] = useState<Profile | "all">("all");
  const [loading, setLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [links, setLinks] = useState<AppLink[]>([]);
  const [orders, setOrders] = useState<DesignOrder[]>([]);
  const [projects, setProjects] = useState<FreelanceProject[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [t, l, o, p, e] = await Promise.all([
          api<Task[]>("/api/tasks"),
          api<AppLink[]>("/api/links"),
          api<DesignOrder[]>("/api/design-orders"),
          api<FreelanceProject[]>("/api/freelance-projects"),
          api<CalEvent[]>("/api/events"),
        ]);
        setTasks(t);
        setLinks(l);
        setOrders(o);
        setProjects(p);
        setEvents(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // ---- Tasks ----
  async function addTask(t: { profile: Profile; title: string; due_date: string | null; priority: Task["priority"] }) {
    const created = await api<Task>("/api/tasks", { method: "POST", body: JSON.stringify(t) });
    setTasks((prev) => [created, ...prev]);
  }
  async function updateTask(id: number, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    await api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  }
  async function deleteTask(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await api(`/api/tasks/${id}`, { method: "DELETE" });
  }

  // ---- Links ----
  async function addLink(l: Omit<AppLink, "id">) {
    const created = await api<AppLink>("/api/links", { method: "POST", body: JSON.stringify(l) });
    setLinks((prev) => [...prev, created]);
  }
  async function deleteLink(id: number) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    await api(`/api/links/${id}`, { method: "DELETE" });
  }

  // ---- Design orders ----
  async function addOrder(o: { client_name: string; description: string; priority: DesignOrder["priority"]; due_date: string | null }) {
    const created = await api<DesignOrder>("/api/design-orders", { method: "POST", body: JSON.stringify(o) });
    setOrders((prev) => [created, ...prev]);
  }
  async function updateOrder(id: number, patch: Partial<DesignOrder>) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    await api(`/api/design-orders/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  }
  async function deleteOrder(id: number) {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await api(`/api/design-orders/${id}`, { method: "DELETE" });
  }

  // ---- Freelance projects ----
  async function addProject(p: {
    client_name: string;
    project_name: string;
    description: string;
    priority: FreelanceProject["priority"];
    deadline: string | null;
    rate: string;
  }) {
    const created = await api<FreelanceProject>("/api/freelance-projects", {
      method: "POST",
      body: JSON.stringify(p),
    });
    setProjects((prev) => [created, ...prev]);
  }
  async function updateProject(id: number, patch: Partial<FreelanceProject>) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await api(`/api/freelance-projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  }
  async function deleteProject(id: number) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    await api(`/api/freelance-projects/${id}`, { method: "DELETE" });
  }

  // ---- Events ----
  async function addEvent(title: string, date: string) {
    const profile: Profile = scope === "all" ? "general" : scope;
    const created = await api<CalEvent>("/api/events", {
      method: "POST",
      body: JSON.stringify({ profile, title, date }),
    });
    setEvents((prev) => [...prev, created]);
  }

  const calItems: CalItem[] = useMemo(() => {
    const items: CalItem[] = [];
    for (const t of tasks) {
      if (t.due_date) items.push({ id: `task-${t.id}`, date: t.due_date.slice(0, 10), title: t.title, profile: t.profile, kind: "task" });
    }
    for (const o of orders) {
      if (o.due_date) items.push({ id: `order-${o.id}`, date: o.due_date.slice(0, 10), title: `${o.client_name} design due`, profile: "design", kind: "design" });
    }
    for (const p of projects) {
      if (p.deadline) items.push({ id: `proj-${p.id}`, date: p.deadline.slice(0, 10), title: `${p.project_name} due`, profile: "freelance", kind: "freelance" });
    }
    for (const e of events) {
      items.push({ id: `event-${e.id}`, date: e.date.slice(0, 10), title: e.title, profile: e.profile, kind: "event" });
    }
    return items;
  }, [tasks, orders, projects, events]);

  const filteredTasks = scope === "all" ? tasks : tasks.filter((t) => t.profile === scope);
  const filteredLinks = scope === "all" ? links : links.filter((l) => l.profile === scope);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        Loading your workflow…
      </div>
    );
  }

  const heroMeta = PROFILE_META[scope];
  const today = new Date();

  return (
    <div className="min-h-screen bg-[#f6f7f9] lg:flex">
      {/* Sidebar */}
      <aside className="lg:w-64 lg:flex-shrink-0 bg-slate-950 lg:min-h-screen lg:sticky lg:top-0 lg:self-start">
        <div className="flex flex-col h-full lg:h-screen px-4 py-5">
          <div className="flex items-center gap-2.5 px-2 mb-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-hotel via-design to-freelance text-white font-bold text-sm shadow-card">
              W
            </span>
            <div>
              <p className="text-white font-semibold leading-tight">WorkFlow</p>
              <p className="text-[11px] text-slate-500 leading-tight">Pixelate MV</p>
            </div>
          </div>

          <ProfileTabs active={scope} onChange={setScope} />

          <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between px-2">
            <div>
              <p className="text-xs text-slate-500">Signed in</p>
              <p className="text-sm text-slate-300">daringdulls</p>
            </div>
            <button
              onClick={logout}
              className="text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 transition"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur sticky top-0 z-10">
          <div className="px-4 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{heroMeta.label}</h1>
              <p className="text-sm text-slate-400">
                {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${heroMeta.chipBg} ${heroMeta.chipText}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${heroMeta.accentBg}`} />
              Live workspace
            </span>
          </div>
        </header>

        <main className="px-4 sm:px-8 py-6 space-y-6 max-w-6xl">
          <SummaryStrip scope={scope} tasks={tasks} orders={orders} projects={projects} />

          {scope === "all" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TaskList scope="all" tasks={filteredTasks} onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask} />
              <Calendar items={calItems} scope="all" onAddEvent={addEvent} />
            </div>
          )}

          {scope === "hotel" && (
            <div className="space-y-6">
              <AppLauncher profile="hotel" links={filteredLinks} onAdd={addLink} onDelete={deleteLink} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TaskList scope="hotel" tasks={filteredTasks} onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask} />
                <Calendar items={calItems} scope="hotel" onAddEvent={addEvent} />
              </div>
            </div>
          )}

          {scope === "design" && (
            <div className="space-y-6">
              <AppLauncher profile="design" links={filteredLinks} onAdd={addLink} onDelete={deleteLink} />
              <DesignBoard orders={orders} onAdd={addOrder} onUpdate={updateOrder} onDelete={deleteOrder} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TaskList scope="design" tasks={filteredTasks} onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask} />
                <Calendar items={calItems} scope="design" onAddEvent={addEvent} />
              </div>
            </div>
          )}

          {scope === "freelance" && (
            <div className="space-y-6">
              <AppLauncher profile="freelance" links={filteredLinks} onAdd={addLink} onDelete={deleteLink} />
              <FreelanceTracker projects={projects} onAdd={addProject} onUpdate={updateProject} onDelete={deleteProject} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TaskList scope="freelance" tasks={filteredTasks} onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask} />
                <Calendar items={calItems} scope="freelance" onAddEvent={addEvent} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const TILE_ICONS: Record<string, string> = {
  "Open tasks": "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  "High priority": "M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .89-1.46L13.71 3.86a1 1 0 0 0-1.72 0Z",
  "Design orders in progress": "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z M12 3v18 M4 7.5l8 4.5 8-4.5",
  "Active freelance projects": "M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18",
};

const TILE_ACCENT: Record<string, string> = {
  "Open tasks": "text-hotel bg-hotel-50",
  "High priority": "text-status-critical bg-red-50",
  "Design orders in progress": "text-design bg-design-50",
  "Active freelance projects": "text-freelance bg-freelance-50",
};

function SummaryStrip({
  scope,
  tasks,
  orders,
  projects,
}: {
  scope: Profile | "all";
  tasks: Task[];
  orders: DesignOrder[];
  projects: FreelanceProject[];
}) {
  const openTasks = tasks.filter((t) => t.status !== "done" && (scope === "all" || t.profile === scope));
  const urgent = openTasks.filter((t) => t.priority === "urgent" || t.priority === "high");
  const openOrders = orders.filter((o) => o.status !== "delivered");
  const activeProjects = projects.filter((p) => p.status === "active" || p.status === "review");

  const tiles = [
    { label: "Open tasks", value: openTasks.length },
    { label: "High priority", value: urgent.length },
    ...(scope === "all" || scope === "design" ? [{ label: "Design orders in progress", value: openOrders.length }] : []),
    ...(scope === "all" || scope === "freelance" ? [{ label: "Active freelance projects", value: activeProjects.length }] : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="bg-white rounded-2xl border border-slate-200/80 shadow-card px-4 py-4 flex items-start justify-between"
        >
          <div>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">{tile.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{tile.label}</p>
          </div>
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${TILE_ACCENT[tile.label]}`}>
            <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
              <path d={TILE_ICONS[tile.label]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      ))}
    </div>
  );
}
