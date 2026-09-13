import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { QUOTATION_STATUS_TONE } from "@/lib/status-styles";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

export default async function QuotationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const user = await getCurrentUser();
  const supabase = createClient();

  let query = supabase.from("quotations").select("*, properties(name), guests(first_name, last_name)").order("created_at", { ascending: false });
  if (user?.profile?.organization_id) query = query.eq("organization_id", user.profile.organization_id);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  const { data: quotations } = await query;

  const columns: Column<any>[] = [
    { header: "Quotation #", cell: (q) => <span className="font-medium text-navy-900">{q.quotation_number}</span> },
    { header: "Guest", cell: (q) => (q.guests ? `${q.guests.first_name} ${q.guests.last_name}` : "—") },
    { header: "Property", cell: (q) => q.properties?.name ?? "—" },
    { header: "Dates", cell: (q) => (q.arrival_date ? `${formatDate(q.arrival_date)} → ${formatDate(q.departure_date)}` : "—") },
    { header: "Total", cell: (q) => formatCurrency(q.total_amount, q.currency) },
    { header: "Status", cell: (q) => <StatusBadge status={q.status} tone={QUOTATION_STATUS_TONE[q.status]} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Build and send quotes, then convert accepted ones straight into bookings."
        actions={
          <a href="/quotations/new" className="btn-primary">
            New Quotation
          </a>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["", "draft", "sent", "viewed", "accepted", "rejected", "expired", "converted"].map((s) => (
          <a
            key={s || "all"}
            href={`/quotations${s ? `?status=${s}` : ""}`}
            className={`badge ${searchParams.status === s || (!searchParams.status && !s) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {s ? titleCase(s) : "All"}
          </a>
        ))}
      </div>

      {!quotations || quotations.length === 0 ? (
        <EmptyState icon={FileText} title="No quotations yet" description="Create a quotation from a lead, or start a new one directly." actionLabel="New Quotation" actionHref="/quotations/new" />
      ) : (
        <DataTable columns={columns} rows={quotations} rowHref={(q) => `/quotations/${q.id}`} />
      )}
    </div>
  );
}
