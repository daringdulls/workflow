import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { APP_CONNECTION_TONE, SYNC_STATUS_TONE } from "@/lib/status-styles";
import { formatDateTime, timeAgo, titleCase } from "@/lib/format";
import { History, ExternalLink } from "lucide-react";
import { setConnectionStatus, setAppUrl } from "../actions";

export default async function AppConnectionDetailPage({ params }: { params: { appKey: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  const { data: app } = await supabase.from("app_connections").select("*").eq("app_key", params.appKey).maybeSingle();
  if (!app) notFound();

  const { data: syncLogs } = await supabase.from("sync_logs").select("*").eq("app_key", app.app_key).order("started_at", { ascending: false }).limit(10);

  const canManage = Boolean(user?.profile?.is_org_admin);
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-pixel-core-domain.com"}/api/v1/webhooks/${app.app_key.replace("_", "-")}`;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={app.app_name}
        description={app.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {app.app_url && (
              <a href={app.app_url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-1.5">
                Open App <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <StatusBadge status={app.status} tone={APP_CONNECTION_TONE[app.status]} />
          </div>
        }
      />

      {canManage && (
        <div className="card p-5">
          <p className="mb-2 text-sm font-semibold text-navy-900">Live App URL</p>
          <form action={setAppUrl.bind(null, app.app_key)} className="flex flex-wrap items-center gap-2">
            <input
              type="url"
              name="app_url"
              defaultValue={app.app_url ?? ""}
              placeholder="https://your-app.vercel.app"
              className="input flex-1 min-w-[240px]"
            />
            <button type="submit" className="btn-secondary">
              Save
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            Where this app is actually deployed. Set it once to get the &quot;Open App&quot; shortcut above.
          </p>
        </div>
      )}

      <div className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
        <Info label="App key" value={app.app_key} />
        <Info label="Last sync" value={app.last_sync_at ? timeAgo(app.last_sync_at) : "Never"} />
        <Info label="Primary source" value={app.is_primary_source ? "Yes" : "No"} />
        <Info label="API key ref" value={app.api_key_ref ?? "Not configured"} />
        <Info label="Webhook secret ref" value={app.webhook_secret_ref ?? "Set via PIXEL_WEBHOOK_SECRETS"} />
        <Info label="Allowed events" value={app.allowed_events.length ? app.allowed_events.join(", ") : "—"} />
      </div>

      <div className="card p-5">
        <p className="mb-1 text-sm font-semibold text-navy-900">Webhook endpoint</p>
        <code className="block rounded-lg bg-navy-900 px-3 py-2 text-xs text-white">POST {webhookUrl}</code>
        <p className="mt-2 text-xs text-slate-400">
          Authenticate with header <code className="rounded bg-slate-100 px-1">x-pixel-secret</code> using this app&apos;s secret from{" "}
          <code className="rounded bg-slate-100 px-1">PIXEL_WEBHOOK_SECRETS</code>.
        </p>
      </div>

      {canManage && (
        <div className="card flex flex-wrap items-center gap-2 p-5">
          <p className="mr-2 text-sm font-semibold text-navy-900">Set status:</p>
          {(["connected", "disconnected", "syncing", "error", "coming_soon"] as const).map((s) => (
            <form key={s} action={setConnectionStatus.bind(null, app.app_key, s)}>
              <button type="submit" className={`badge ${app.status === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {titleCase(s)}
              </button>
            </form>
          ))}
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-navy-900">Recent Sync Activity</p>
        {!syncLogs || syncLogs.length === 0 ? (
          <EmptyState icon={History} title="No sync activity yet" description="Sync runs from this app will appear here once it's connected." />
        ) : (
          <div className="card divide-y divide-slate-100">
            {syncLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="text-navy-900">{formatDateTime(log.started_at)}</p>
                  <p className="text-xs text-slate-400">
                    {log.records_received} received · {log.records_sent} sent · {log.failed_records} failed
                  </p>
                </div>
                <StatusBadge status={log.status} tone={SYNC_STATUS_TONE[log.status] ?? "slate"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="break-all text-sm font-medium text-navy-900">{value}</p>
    </div>
  );
}
