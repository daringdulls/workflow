import { Activity } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo, titleCase } from "@/lib/format";

export interface ActivityRow {
  id: string;
  created_at: string;
  application: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  user_name: string;
}

export function RecentActivity({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Bookings, guest updates, and sync events across Pixel apps will appear here as they happen."
      />
    );
  }

  return (
    <div className="card divide-y divide-slate-100">
      {rows.map((row) => (
        <div key={row.id} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-navy-900">
              <span className="font-medium">{row.user_name}</span>{" "}
              <span className="text-slate-500">{titleCase(row.action)}</span>{" "}
              <span className="font-medium">{titleCase(row.entity_type)}</span>
              {row.entity_id ? <span className="text-slate-400"> · {row.entity_id.slice(0, 8)}</span> : null}
            </p>
            <p className="text-xs text-slate-400">{titleCase(row.application)}</p>
          </div>
          <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">{timeAgo(row.created_at)}</span>
        </div>
      ))}
    </div>
  );
}
