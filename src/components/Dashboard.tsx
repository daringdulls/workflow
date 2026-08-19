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
import ThemeToggle from "./ThemeToggle";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return res.json();
}

function toISO(d: Date) {
  // Local calendar fields, not toISOString() (UTC) — see Calendar.tsx for why.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Dashboard() {
  const router = useRouter();
  const [scope, setScope] = useState<Profile | "all">("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
  async function addOrder(o: {
    order_name: string;
    order_type: string;
    design_type: string;
    client_name: string;
    contact: string;
    sponsor: string;
    description: string;
    priority: DesignOrder["priority"];
    requested_date: string | null;
    due_date: string | null;
  }) {
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
      if (o.due_date) items.push({ id: `order-${o.id}`, date: o.due_date.slice(0, 10), title: `${o.order_name || o.client_name} due`, profile: "design", kind: "design" });
    }
    for (const p of projects) {
      if (p.deadline) items.push({ id: `proj-${p.id}`, date: p.deadline.slice(0, 10), title: `${p.project_name} due`, profile: "freelance", kind: "freelance" });
    }
    for (const e of events) {
      items.push({ id: `event-${e.id}`, date: e.date.slice(0, 10), title: e.title, profile: e.profile, kind: "event" });
    }
    return items;
  }, [tasks, orders, projects, events]);

  const notifications = useMemo(() => {
    const todayISO = toISO(new Date());
    const items: { id: string; text: string; tone: "critical" | "warning" }[] = [];
    for (const t of tasks) {
      if (t.status === "done") continue;
      if (t.due_date) {
        const d = t.due_date.slice(0, 10);
        if (d < todayISO) items.push({ id: `t-${t.id}`, text: `"${t.title}" is overdue`, tone: "critical" });
        else if (d === todayISO) items.push({ id: `t-${t.id}`, text: `"${t.title}" is due today`, tone: "warning" });
      } else if (t.priority === "urgent") {
        items.push({ id: `t-${t.id}`, text: `"${t.title}" is marked urgent`, tone: "critical" });
      }
    }
    for (const o of orders) {
      if (o.status === "delivered" || !o.due_date) continue;
      const d = o.due_date.slice(0, 10);
      const orderLabel = o.order_name || o.client_name;
      if (d < todayISO) items.push({ id: `o-${o.id}`, text: `${orderLabel} is overdue`, tone: "critical" });
      else if (d === todayISO) items.push({ id: `o-${o.id}`, text: `${orderLabel} is due today`, tone: "warning" });
    }
    for (const p of projects) {
      if (p.status === "delivered" || p.status === "paid" || !p.deadline) continue;
      const d = p.deadline.slice(0, 10);
      if (d < todayISO) items.push({ id: `p-${p.id}`, text: `${p.project_name} deadline has passed`, tone: "critical" });
      else if (d === todayISO) items.push({ id: `p-${p.id}`, text: `${p.project_name} is due today`, tone: "warning" });
    }
    return items.slice(0, 8);
  }, [tasks, orders, projects]);

  const filteredTasks = scope === "all" ? tasks : tasks.filter((t) => t.profile === scope);
  const filteredLinks = scope === "all" ? links : links.filter((l) => l.profile === scope);

  const q = search.trim().toLowerCase();
  const searchedTasks = q ? filteredTasks.filter((t) => t.title.toLowerCase().includes(q)) : filteredTasks;
  const searchedLinks = q ? filteredLinks.filter((l) => l.label.toLowerCase().includes(q)) : filteredLinks;
  const searchedOrders = q
    ? orders.filter(
        (o) =>
          o.client_name.toLowerCase().includes(q) ||
          (o.order_name ?? "").toLowerCase().includes(q) ||
          (o.order_type ?? "").toLowerCase().includes(q) ||
          (o.design_type ?? "").toLowerCase().includes(q) ||
          (o.contact ?? "").toLowerCase().includes(q) ||
          (o.sponsor ?? "").toLowerCase().includes(q) ||
          (o.description ?? "").toLowerCase().includes(q) ||
          (o.reference_notes ?? "").toLowerCase().includes(q) ||
          String(o.id).includes(q)
      )
    : orders;
  const searchedProjects = q
    ? projects.filter((p) => p.project_name.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q))
    : projects;

  function viewAll(label: string) {
    setNotifOpen(false);
    if (label === "Design orders in progress" && scope === "all") {
      setScope("design");
      return;
    }
    if (label === "Active freelance projects" && scope === "all") {
      setScope("freelance");
      return;
    }
    const id =
      label === "Design orders in progress"
        ? "design-section"
        : label === "Active freelance projects"
        ? "freelance-section"
        : "tasks-section";
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        Loading your workflow…
      </div>
    );
  }

  const heroMeta = PROFILE_META[scope];
  const today = new Date();
  const hour = today.getHours();
  const greetingWord = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const anyMenuOpen = notifOpen || profileMenuOpen;

  return (
    <div className="min-h-screen bg-[#f6f7f9] dark:bg-slate-950 lg:flex transition-colors">
      {anyMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setNotifOpen(false);
            setProfileMenuOpen(false);
          }}
        />
      )}

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

          <div className="mt-auto pt-4 border-t border-white/5 relative">
            <button
              onClick={() => {
                setProfileMenuOpen((v) => !v);
                setNotifOpen(false);
              }}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition relative z-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-hotel via-design to-freelance text-white text-xs font-semibold">
                DA
              </span>
              <span className="flex-1 min-w-0 text-left">
                <p className="text-sm text-slate-200 font-medium truncate">daringdulls</p>
                <p className="text-[11px] text-slate-500">Admin</p>
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`h-4 w-4 text-slate-500 transition-transform shrink-0 ${profileMenuOpen ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {profileMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <button
                  onClick={logout}
                  className="w-full text-left px-3.5 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="border-b border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-20">
          <div className="px-4 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 truncate">
                {scope === "all" ? `${greetingWord}, daringdulls` : heroMeta.label}
              </h1>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <div className="relative hidden md:block">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search anything…"
                  className="w-56 lg:w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 pr-9 text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-hotel-400 transition"
                />
                <svg viewBox="0 0 24 24" fill="none" className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setProfileMenuOpen(false);
                  }}
                  aria-label="Notifications"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition z-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
                    <path
                      d="M6 8a6 6 0 1 1 12 0c0 3.2 1 5 1.6 5.8a1 1 0 0 1-.8 1.7H5.2a1 1 0 0 1-.8-1.7C5 13 6 11.2 6 8Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-critical px-1 text-[10px] font-semibold text-white">
                      {notifications.length}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50">
                    <p className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800">
                      Notifications
                    </p>
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-slate-400 text-center">You&apos;re all caught up.</p>
                    ) : (
                      <div className="py-1">
                        {notifications.map((n) => (
                          <div key={n.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <span
                              className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                                n.tone === "critical" ? "bg-status-critical" : "bg-status-warning"
                              }`}
                            />
                            <p className="text-sm text-slate-600 dark:text-slate-300">{n.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <ThemeToggle />

              <span
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${heroMeta.chipBg} ${heroMeta.chipText} ${heroMeta.chipDarkBg} ${heroMeta.chipDarkText}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${heroMeta.accentBg}`} />
                Live workspace
              </span>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-8 py-6 space-y-6 max-w-6xl">
          <SummaryStrip scope={scope} tasks={tasks} orders={orders} projects={projects} onViewAll={viewAll} />

          {scope === "all" && (
            <div id="tasks-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-24">
              <TaskList scope="all" tasks={searchedTasks} onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask} />
              <Calendar items={calItems} scope="all" onAddEvent={addEvent} />
            </div>
          )}

          {scope === "hotel" && (
            <div className="space-y-6">
              <AppLauncher profile="hotel" links={searchedLinks} onAdd={addLink} onDelete={deleteLink} />
              <div id="tasks-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-24">
                <TaskList scope="hotel" tasks={searchedTasks} onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask} />
                <Calendar items={calItems} scope="hotel" onAddEvent={addEvent} />
              </div>
            </div>
          )}

          {scope === "design" && (
            <div className="space-y-6">
              <AppLauncher profile="design" links={searchedLinks} onAdd={addLink} onDelete={deleteLink} />
              <div id="design-section" className="scroll-mt-24">
                <DesignBoard orders={searchedOrders} onAdd={addOrder} onUpdate={updateOrder} onDelete={deleteOrder} />
              </div>
              <div id="tasks-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-24">
                <TaskList scope="design" tasks={searchedTasks} onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask} />
                <Calendar items={calItems} scope="design" onAddEvent={addEvent} />
              </div>
            </div>
          )}

          {scope === "freelance" && (
            <div className="space-y-6">
              <AppLauncher profile="freelance" links={searchedLinks} onAdd={addLink} onDelete={deleteLink} />
              <div id="freelance-section" className="scroll-mt-24">
                <FreelanceTracker projects={searchedProjects} onAdd={addProject} onUpdate={updateProject} onDelete={deleteProject} />
              </div>
              <div id="tasks-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-24">
                <TaskList scope="freelance" tasks={searchedTasks} onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask} />
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
  "Open tasks": "text-hotel bg-hotel-50 dark:bg-hotel/15 dark:text-hotel-400",
  "High priority": "text-status-critical bg-red-50 dark:bg-red-500/15 dark:text-red-400",
  "Design orders in progress": "text-design bg-design-50 dark:bg-design/15 dark:text-design-400",
  "Active freelance projects": "text-freelance bg-freelance-50 dark:bg-freelance/15 dark:text-freelance-400",
};

const TILE_LINK: Record<string, string> = {
  "Open tasks": "text-hotel dark:text-hotel-400",
  "High priority": "text-status-critical dark:text-red-400",
  "Design orders in progress": "text-design dark:text-design-400",
  "Active freelance projects": "text-freelance dark:text-freelance-400",
};

function SummaryStrip({
  scope,
  tasks,
  orders,
  projects,
  onViewAll,
}: {
  scope: Profile | "all";
  tasks: Task[];
  orders: DesignOrder[];
  projects: FreelanceProject[];
  onViewAll: (label: string) => void;
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
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card px-4 py-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TILE_ACCENT[tile.label]}`}>
              <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
                <path d={TILE_ICONS[tile.label]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">{tile.value}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{tile.label}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onViewAll(tile.label)}
              className={`flex items-center gap-1 text-xs font-medium hover:underline ${TILE_LINK[tile.label]}`}
            >
              View all
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
