import { ListTree } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EVENT_STATUS_TONE } from "@/lib/status-styles";
import { formatDateTime, titleCase } from "@/lib/format";
import type { PixelEvent } from "@/lib/database.types";

export default async function EventLogsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  let query = supabase.from("events").select("*").order("created_at", { ascending: false }).limit(100);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  const { data: events } = await query;

  const columns: Column<PixelEvent>[] = [
    { header: "Event #", cell: (e) => e.event_number },
    { header: "Type", cell: (e) => <span className="font-medium text-navy-900">{e.event_type}</span> },
    { header: "Source", cell: (e) => titleCase(e.source_app) },
    { header: "Target", cell: (e) => (e.target_app ? titleCase(e.target_app) : "—") },
    { header: "Entity", cell: (e) => titleCase(e.entity_type) },
    { header: "Status", cell: (e) => <StatusBadge status={e.status} tone={EVENT_STATUS_TONE[e.status]} /> },
    { header: "Retries", cell: (e) => e.retry_count },
    { header: "Created", cell: (e) => formatDateTime(e.created_at) },
  ];

  return (
    <div>
      <PageHeader title="Event Logs" description="Every event flowing through Pixel Core's internal event system." />

      <div className="mb-4 flex flex-wrap gap-2">
        {["", "pending", "processing", "completed", "failed"].map((s) => (
          <a
            key={s || "all"}
            href={`/integrations/events${s ? `?status=${s}` : ""}`}
            className={`badge ${searchParams.status === s || (!searchParams.status && !s) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {s ? titleCase(s) : "All"}
          </a>
        ))}
      </div>

      {!events || events.length === 0 ? (
        <EmptyState icon={ListTree} title="No events yet" description="Events are created automatically as bookings, guests and other records change." />
      ) : (
        <DataTable columns={columns} rows={events} />
      )}
    </div>
  );
}
