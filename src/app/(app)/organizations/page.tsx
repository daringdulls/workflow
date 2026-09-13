import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Organization } from "@/lib/database.types";

export default async function OrganizationsPage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const { data: organizations } = await supabase.from("organizations").select("*").order("name");

  const columns: Column<Organization>[] = [
    { header: "Name", cell: (o) => <span className="font-medium text-navy-900">{o.name}</span> },
    { header: "Slug", cell: (o) => o.slug },
    { header: "Status", cell: (o) => <StatusBadge status={o.status} tone={o.status === "active" ? "emerald" : "slate"} /> },
  ];

  return (
    <div>
      <PageHeader title="Organizations" description="The Pixel accounts that share this Pixel Core instance." />
      {!organizations || organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organization set up yet"
          description="Run the Pixel Core seed script to create your first organization, or ask a platform administrator."
        />
      ) : (
        <DataTable columns={columns} rows={organizations} rowHref={(o) => `/organizations/${o.id}`} />
      )}
      {!user?.profile?.is_org_admin && (
        <p className="mt-3 text-xs text-slate-400">Contact a Company Admin to make changes to your organization.</p>
      )}
    </div>
  );
}
