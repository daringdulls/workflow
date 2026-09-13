import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { AppStatusGrid } from "@/components/dashboard/app-status-grid";
import type { AppConnection, SyncLog } from "@/lib/database.types";

export default async function AppConnectionsPage() {
  const supabase = createClient();
  const [{ data: apps }, { data: syncLogs }] = await Promise.all([
    supabase.from("app_connections").select("*").order("is_primary_source", { ascending: false }).order("app_name"),
    supabase.from("sync_logs").select("*").order("started_at", { ascending: false }).limit(100),
  ]);

  const latestLogs: Record<string, SyncLog | undefined> = {};
  for (const log of syncLogs ?? []) {
    if (!latestLogs[log.app_key]) latestLogs[log.app_key] = log as SyncLog;
  }

  return (
    <div>
      <PageHeader title="App Connections" description="Every Pixel application connected to this Pixel Core instance." />
      <AppStatusGrid apps={(apps ?? []) as AppConnection[]} latestLogs={latestLogs} />
    </div>
  );
}
