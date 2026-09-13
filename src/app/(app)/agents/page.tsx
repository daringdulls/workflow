import { Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Agent } from "@/lib/database.types";

export default async function AgentsPage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const { data: agents } = user?.profile?.organization_id
    ? await supabase.from("agents").select("*").eq("organization_id", user.profile.organization_id).order("company_name")
    : { data: [] as Agent[] };

  const columns: Column<Agent>[] = [
    { header: "Company", cell: (a) => <span className="font-medium text-navy-900">{a.company_name}</span> },
    { header: "Code", cell: (a) => a.agent_code },
    { header: "Contact", cell: (a) => a.contact_person ?? "—" },
    { header: "Market", cell: (a) => a.market ?? "—" },
    { header: "Country", cell: (a) => a.country ?? "—" },
    { header: "Status", cell: (a) => <StatusBadge status={a.status} tone={a.status === "active" ? "emerald" : "slate"} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Agents & Companies"
        description="Travel agents and companies — the foundation for Pixel B2B."
        actions={
          <a href="/agents/new" className="btn-primary">
            Add Agent
          </a>
        }
      />
      {!agents || agents.length === 0 ? (
        <EmptyState icon={Briefcase} title="No agents yet" description="Add agents and companies to assign special rates and track bookings." actionLabel="Add Agent" actionHref="/agents/new" />
      ) : (
        <DataTable columns={columns} rows={agents} rowHref={(a) => `/agents/${a.id}`} />
      )}
    </div>
  );
}
