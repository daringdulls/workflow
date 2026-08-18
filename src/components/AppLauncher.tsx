"use client";

import { useState } from "react";
import { AppLink, Profile } from "@/lib/types";

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
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800">Quick Launch</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          {adding ? "Cancel" : "+ Add app"}
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="flex flex-wrap gap-2 mb-4">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🔗"
            className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-center"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="App name"
            className="flex-1 min-w-[120px] rounded-lg border border-slate-200 px-3 py-1.5"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="flex-[2] min-w-[160px] rounded-lg border border-slate-200 px-3 py-1.5"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 text-white px-4 py-1.5 text-sm"
          >
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
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-3 py-4 text-center transition"
            >
              <span className="text-2xl">{link.emoji}</span>
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
