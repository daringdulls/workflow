"use client";

import { useState } from "react";
import { AppLink, Profile } from "@/lib/types";

const ACCENT: Record<Profile, { btn: string; ring: string; chip: string; ghost: string }> = {
  hotel: {
    btn: "bg-hotel hover:bg-hotel-700",
    ring: "hover:border-hotel-100 dark:hover:border-hotel/40 hover:ring-1 hover:ring-hotel-100 dark:hover:ring-hotel/30",
    chip: "bg-hotel-50 dark:bg-hotel/15",
    ghost: "hover:border-hotel-300 hover:text-hotel dark:hover:border-hotel/50 dark:hover:text-hotel-400",
  },
  design: {
    btn: "bg-design hover:bg-design-700",
    ring: "hover:border-design-100 dark:hover:border-design/40 hover:ring-1 hover:ring-design-100 dark:hover:ring-design/30",
    chip: "bg-design-50 dark:bg-design/15",
    ghost: "hover:border-design-300 hover:text-design dark:hover:border-design/50 dark:hover:text-design-400",
  },
  freelance: {
    btn: "bg-freelance hover:bg-freelance-700",
    ring: "hover:border-freelance-100 dark:hover:border-freelance/40 hover:ring-1 hover:ring-freelance-100 dark:hover:ring-freelance/30",
    chip: "bg-freelance-50 dark:bg-freelance/15",
    ghost: "hover:border-freelance-300 hover:text-freelance dark:hover:border-freelance/50 dark:hover:text-freelance-400",
  },
  general: {
    btn: "bg-slate-700 hover:bg-slate-800",
    ring: "hover:border-slate-200 dark:hover:border-slate-600",
    chip: "bg-slate-100 dark:bg-slate-800",
    ghost: "hover:border-slate-400 hover:text-slate-600 dark:hover:border-slate-500 dark:hover:text-slate-300",
  },
};

export default function AppLauncher({
  profile,
  links,
  onAdd,
  onDelete,
}: {
  profile: Profile;
  links: AppLink[];
  onAdd: (link: Omit<AppLink, "id">) => void;
  onDelete: (id: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [emoji, setEmoji] = useState("🔗");
  const accent = ACCENT[profile];
  const inputCls =
    "rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    onAdd({ profile, label: label.trim(), url: url.trim(), emoji: emoji || "🔗", sort_order: links.length });
    setLabel("");
    setUrl("");
    setEmoji("🔗");
    setAdding(false);
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Quick Access</h2>
        {adding && (
          <button
            onClick={() => setAdding(false)}
            className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Cancel
          </button>
        )}
      </div>

      {adding && (
        <form
          onSubmit={submit}
          className="flex flex-wrap gap-2 mb-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800"
        >
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🔗" className={`w-14 text-center ${inputCls}`} />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="App name"
            className={`flex-1 min-w-[120px] ${inputCls}`}
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className={`flex-[2] min-w-[160px] ${inputCls}`}
          />
          <button type="submit" className={`rounded-lg text-white px-4 py-1.5 text-sm font-medium ${accent.btn}`}>
            Save
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {links.map((link) => (
          <div key={link.id} className="group relative">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-4 text-left transition shadow-card hover:shadow-card-hover bg-white dark:bg-slate-900 ${accent.ring}`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${accent.chip}`}>
                {link.emoji}
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-tight">{link.label}</span>
            </a>
            <button
              onClick={() => onDelete(link.id)}
              className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white text-xs"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={() => setAdding((v) => !v)}
          className={`flex flex-col items-start gap-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 px-4 py-4 text-left transition text-slate-400 dark:text-slate-500 ${accent.ghost}`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-current text-lg">
            +
          </span>
          <span className="text-xs font-medium">Add app</span>
        </button>

        {links.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 col-span-full order-first">
            No apps added yet for this profile — use “Add app” to get started.
          </p>
        )}
      </div>
    </div>
  );
}
