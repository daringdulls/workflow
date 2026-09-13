import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendDirection = "up",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: "up" | "down" | "flat";
}) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-alt text-brand-600">
          <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-navy-900">{value}</span>
        {trend ? (
          <span
            className={clsx(
              "text-xs font-medium",
              trendDirection === "up" && "text-success-600",
              trendDirection === "down" && "text-danger-600",
              trendDirection === "flat" && "text-slate-400"
            )}
          >
            {trend}
          </span>
        ) : null}
      </div>
    </div>
  );
}
