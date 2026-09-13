import { DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

export default async function RatesPage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const { data: rates } = user?.profile?.organization_id
    ? await supabase
        .from("rate_plans")
        .select("*, properties(name), room_types(name), agents(company_name)")
        .eq("organization_id", user.profile.organization_id)
        .order("start_date", { ascending: false })
    : { data: [] };

  const columns: Column<any>[] = [
    { header: "Rate", cell: (r) => <span className="font-medium text-navy-900">{r.name}</span> },
    { header: "Type", cell: (r) => titleCase(r.rate_type) },
    { header: "Property", cell: (r) => r.properties?.name ?? "—" },
    { header: "Room Type", cell: (r) => r.room_types?.name ?? "All" },
    { header: "Agent", cell: (r) => r.agents?.company_name ?? "—" },
    { header: "Amount", cell: (r) => formatCurrency(r.amount, r.currency) },
    { header: "Valid", cell: (r) => `${formatDate(r.start_date)} → ${formatDate(r.end_date)}` },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} tone={r.status === "active" ? "emerald" : r.status === "expired" ? "slate" : "amber"} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Rate Engine"
        description="One shared rate engine used by reservations, quotations and future B2B/B2C channels."
        actions={
          <a href="/rates/new" className="btn-primary">
            Add Rate
          </a>
        }
      />
      {!rates || rates.length === 0 ? (
        <EmptyState icon={DollarSign} title="No rates yet" description="Add public, agent or promotional rates for your room types." actionLabel="Add Rate" actionHref="/rates/new" />
      ) : (
        <DataTable columns={columns} rows={rates} rowHref={(r) => `/rates/${r.id}`} />
      )}
    </div>
  );
}
