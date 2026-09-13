"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface SearchGroup {
  label: string;
  results: { id: string; title: string; subtitle: string; href: string }[];
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setGroups([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setGroups(data.groups ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search guests, bookings, properties…"
          className="input pl-9 pr-8"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setGroups([]);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-100 bg-white p-2 shadow-card-hover">
          {loading && <p className="px-3 py-4 text-center text-sm text-slate-400">Searching…</p>}
          {!loading && groups.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-slate-400">No matches for &quot;{query}&quot;</p>
          )}
          {!loading &&
            groups.map((group) => (
              <div key={group.label} className="mb-1 last:mb-0">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {group.label}
                </p>
                {group.results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      router.push(result.href);
                    }}
                    className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-alt"
                  >
                    <span className="font-medium text-navy-900">{result.title}</span>
                    {result.subtitle && <span className="text-xs text-slate-500">{result.subtitle}</span>}
                  </button>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
