import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { SYNC_STATUS_TONE } from "@/lib/status-styles";
import { timeAgo } from "@/lib/format";
import { retryFailedEvents } from "./actions";

export default async function SyncMonitorPage() {
  const supabase = createClient();
  const { data: apps } = await supabase.from("app_connections").select("*").order("app_name");
  const { data: logs } = await supabase.from("sync_logs").select("*").order("started_at", { ascending: false }).limit(200);
  const { count: failedEventCount } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "failed");

  const byApp = new Map<string, typeof logs>();
  for (const log of logs ?? []) {
    if (!byApp.has(log.app_key)) byApp.set(log.app_key, []);
    byApp.get(log.app_key)!.push(log);
  }

  return (
    <div>
      <PageHeader title="Sync Monitor" description="Real-time health of every Pixel app's data sync." />

      {!apps || apps.length === 0 ? (
        <EmptyState icon={RefreshCw} title="No connected apps yet" description="Sync activity will appear here once a Pixel app is connected." />
      ) : (
        <div className="space-y-4">
          {apps.map((app) => {
            const appLogs = byApp.get(app.app_key) ?? [];
            const latest = appLogs[0];
            const lastSuccess = appLogs.find((l) => l.status === "synced");
            const failedInApp = appLogs.reduce((s, l) => s + l.failed_records, 0);

            return (
              <div key={app.id} className="card p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{app.app_name}</p>
                    <p className="text-xs text-slate-400">Last sync: {app.last_sync_at ? timeAgo(app.last_sync_at) : "Never"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {latest && <StatusBadge status={latest.status} tone={SYNC_STATUS_TONE[latest.status]} />}
                    {failedInApp > 0 && (
                      <form action={retryFailedEvents.bind(null, app.app_key)}>
                        <button type="submit" className="btn-secondary text-xs">
                          Retry failed
                        </button>
                      </form>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <Stat label="Last successful sync" value={lastSuccess ? timeAgo(lastSuccess.started_at) : "—"} />
                  <Stat label="Records received" value={appLogs.reduce((s, l) => s + l.records_received, 0).toString()} />
                  <Stat label="Records sent" value={appLogs.reduce((s, l) => s + l.records_sent, 0).toString()} />
                  <Stat label="Failed records" value={failedInApp.toString()} danger={failedInApp > 0} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(failedEventCount ?? 0) > 0 && (
        <p className="mt-4 text-xs text-danger-600">{failedEventCount} events are currently failing across the ecosystem.</p>
      )}
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className={`font-medium ${danger ? "text-danger-600" : "text-navy-800"}`}>{value}</p>
    </div>
  );
}
