import { Hotel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Property } from "@/lib/database.types";

export default async function PropertiesPage() {
  const user = await getCurrentUser();
  const supabase = createClient();

  const { data: properties } = user?.profile?.organization_id
    ? await supabase.from("properties").select("*").eq("organization_id", user.profile.organization_id).order("name")
    : { data: [] as Property[] };

  const columns: Column<Property>[] = [
    { header: "Property", cell: (p) => <span className="font-medium text-navy-900">{p.name}</span> },
    { header: "Code", cell: (p) => p.code },
    { header: "City", cell: (p) => p.city ?? "—" },
    { header: "Country", cell: (p) => p.country ?? "—" },
    { header: "Currency", cell: (p) => p.currency },
    { header: "Status", cell: (p) => <StatusBadge status={p.status} tone={p.status === "active" ? "emerald" : "slate"} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Every property that belongs to your organization."
        actions={
          user?.profile?.is_org_admin ? (
            <a href="/properties/new" className="btn-primary">
              Add Property
            </a>
          ) : undefined
        }
      />
      {!properties || properties.length === 0 ? (
        <EmptyState
          icon={Hotel}
          title="No properties yet"
          description="Add your first property to start organizing rooms, rates and reservations."
          actionLabel={user?.profile?.is_org_admin ? "Add Property" : undefined}
          actionHref={user?.profile?.is_org_admin ? "/properties/new" : undefined}
        />
      ) : (
        <DataTable columns={columns} rows={properties} rowHref={(p) => `/properties/${p.id}`} />
      )}
    </div>
  );
}
