import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Star } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { APP_CONNECTION_TONE } from "@/lib/status-styles";
import { timeAgo } from "@/lib/format";
import type { AppConnection, SyncLog } from "@/lib/database.types";

export function AppStatusGrid({
  apps,
  latestLogs,
}: {
  apps: AppConnection[];
  latestLogs: Record<string, SyncLog | undefined>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {apps.map((app) => {
        const log = latestLogs[app.app_key];
        const recordsProcessed = (log?.records_received ?? 0) + (log?.records_sent ?? 0);
        return (
          <Link
            key={app.id}
            href={`/integrations/connections/${app.app_key}`}
            className="card group flex flex-col gap-3 p-5 transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-navy-900">{app.app_name}</p>
                  {app.is_primary_source && (
                    <span title="Main booking source">
                      <Star className="h-3.5 w-3.5 fill-warning-500 text-warning-500" />
                    </span>
                  )}
                </div>
                {app.is_primary_source && <p className="text-[11px] font-medium text-warning-600">Main Source</p>}
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-600" />
            </div>

            <StatusBadge status={app.status} tone={APP_CONNECTION_TONE[app.status] ?? "slate"} />

            <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
              <div>
                <p className="text-slate-400">Last sync</p>
                <p className="font-medium text-navy-800">{app.last_sync_at ? timeAgo(app.last_sync_at) : "Never"}</p>
              </div>
              <div>
                <p className="text-slate-400">Records</p>
                <p className="font-medium text-navy-800">{recordsProcessed.toLocaleString()}</p>
              </div>
              <div className="col-span-2 flex items-center gap-1">
                {log && log.failed_records > 0 ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-danger-500" />
                    <span className="font-medium text-danger-600">{log.failed_records} errors</span>
                  </>
                ) : (
                  <span className="text-slate-400">No errors</span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
