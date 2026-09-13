import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import type { Role } from "@/lib/database.types";

interface Row extends Role {
  role_permissions: { permission_id: string }[];
}

export default async function RolesPage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const { data: roles } = await supabase
    .from("roles")
    .select("*, role_permissions(permission_id)")
    .or(`organization_id.eq.${user?.profile?.organization_id ?? ""},organization_id.is.null`)
    .order("is_system", { ascending: false })
    .order("name");

  const columns: Column<Row>[] = [
    { header: "Role", cell: (r) => <span className="font-medium text-navy-900">{r.name}</span> },
    { header: "Description", cell: (r) => r.description ?? "—" },
    { header: "Permissions", cell: (r) => `${r.role_permissions?.length ?? 0} granted` },
    { header: "Type", cell: (r) => (r.is_system ? "System" : "Custom") },
  ];

  return (
    <div>
      <PageHeader title="Roles & Permissions" description="Control what each role can view and do across Pixel Core." />
      {!roles || roles.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No roles yet" description="Roles are created automatically from the Pixel Core reference data." />
      ) : (
        <DataTable columns={columns} rows={roles as Row[]} rowHref={(r) => `/roles/${r.id}`} />
      )}
    </div>
  );
}
