"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Building2, Check } from "lucide-react";
import type { Property } from "@/lib/database.types";
import { setActiveProperty } from "@/app/actions";

export function PropertySelector({ properties, activePropertyId }: { properties: Property[]; activePropertyId: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const active = properties.find((p) => p.id === activePropertyId);

  function select(id: string | null) {
    setOpen(false);
    startTransition(async () => {
      await setActiveProperty(id);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-navy-800 hover:bg-slate-50 disabled:opacity-60"
      >
        <Building2 className="h-4 w-4 text-brand-600" />
        <span className="max-w-[10rem] truncate">{active ? active.name : "All Properties"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-slate-100 bg-white p-1.5 shadow-card-hover">
            <button
              onClick={() => select(null)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-alt"
            >
              All Properties
              {!active && <Check className="h-4 w-4 text-brand-600" />}
            </button>
            {properties.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400">No properties yet.</p>
            )}
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => select(p.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-alt"
              >
                <span className="truncate">{p.name}</span>
                {active?.id === p.id && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
