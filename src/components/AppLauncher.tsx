"use client";

import { useState } from "react";
import { AppLink, Profile } from "@/lib/types";

const ACCENT: Record<Profile, { btn: string; ring: string; chip: string }> = {
  hotel: { btn: "bg-hotel hover:bg-hotel-700", ring: "hover:border-hotel-100 hover:ring-1 hover:ring-hotel-100", chip: "bg-hotel-50" },
  design: { btn: "bg-design hover:bg-design-700", ring: "hover:border-design-100 hover:ring-1 hover:ring-design-100", chip: "bg-design-50" },
  freelance: { btn: "bg-freelance hover:bg-freelance-700", ring: "hover:border-freelance-100 hover:ring-1 hover:ring-freelance-100", chip: "bg-freelance-50" },
  general: { btn: "bg-slate-700 hover:bg-slate-800", ring: "hover:border-slate-200", chip: "bg-slate-100" },
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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800">Quick Launch</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className={`text-sm font-medium text-white rounded-lg px-3 py-1.5 transition ${accent.btn}`}
        >
          {adding ? "Cancel" : "+ Add app"}
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="flex flex-wrap gap-2 mb-5 bg-slate-50 rounded-xl p-3 border border-slate-100">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🔗"
            className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-center bg-white"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="App name"
            className="flex-1 min-w-[120px] rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="flex-[2] min-w-[160px] rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
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
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-4 text-center transition shadow-card hover:shadow-card-hover ${accent.ring}`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${accent.chip}`}>
                {link.emoji}
              </span>
              <span className="text-xs font-medium text-slate-700 leading-tight">
                {link.label}
              </span>
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
        {links.length === 0 && (
          <p className="text-sm text-slate-400 col-span-full">
            No apps added yet for this profile.
          </p>
        )}
      </div>
    </div>
  );
}
