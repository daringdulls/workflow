import { StatusBadge } from "@/components/ui/status-badge";
import { HEALTH_TONE } from "@/lib/status-styles";
import { timeAgo } from "@/lib/format";

export interface HealthItem {
  label: string;
  status: "healthy" | "warning" | "error";
  detail?: string;
}

export function SystemHealth({ items, lastBackup, lastSync }: { items: HealthItem[]; lastBackup: string | null; lastSync: string | null }) {
  return (
    <div className="card p-5">
      <p className="mb-4 text-sm font-semibold text-navy-900">System Health</p>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-slate-600">{item.label}</span>
            <StatusBadge status={item.status} tone={HEALTH_TONE[item.status]} label={item.detail ?? undefined} />
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-xs">
        <div>
          <p className="text-slate-400">Last backup</p>
          <p className="font-medium text-navy-800">{lastBackup ? timeAgo(lastBackup) : "—"}</p>
        </div>
        <div>
          <p className="text-slate-400">Last successful sync</p>
          <p className="font-medium text-navy-800">{lastSync ? timeAgo(lastSync) : "—"}</p>
        </div>
      </div>
    </div>
  );
}
