"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import clsx from "clsx";
import { RANGE_OPTIONS, type RangeKey } from "@/lib/date-range";

export function DateRangeFilter({ active }: { active: RangeKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setRange(key: RangeKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", key);
    if (key !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setRange(opt.key)}
          className={clsx(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            active === opt.key ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-navy-900"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
