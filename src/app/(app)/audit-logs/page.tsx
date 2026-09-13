import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatDateTime, titleCase } from "@/lib/format";

export default async function AuditLogsPage() {
  const user = await getCurrentUser();
  const supabase = createClient();

  const { data: logs } = user?.profile?.organization_id
    ? await supabase
        .from("audit_logs")
        .select("*, profiles(first_name, last_name)")
        .eq("organization_id", user.profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(150)
    : { data: [] };

  const columns: Column<any>[] = [
    { header: "When", cell: (l) => formatDateTime(l.created_at) },
    { header: "User", cell: (l) => (l.profiles ? `${l.profiles.first_name} ${l.profiles.last_name}` : "System") },
    { header: "Application", cell: (l) => titleCase(l.application) },
    { header: "Entity", cell: (l) => titleCase(l.entity_type) },
    { header: "Record", cell: (l) => (l.entity_id ? l.entity_id.slice(0, 8) : "—") },
    { header: "Action", cell: (l) => titleCase(l.action) },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" description="Every important change across Pixel Core, permanently recorded." />
      {!logs || logs.length === 0 ? (
        <EmptyState icon={History} title="No audit history yet" description="Changes to guests, bookings, rates and settings will be logged here." />
      ) : (
        <DataTable columns={columns} rows={logs} />
      )}
    </div>
  );
}
