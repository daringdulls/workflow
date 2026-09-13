import { Users as UsersIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { USER_STATUS_TONE } from "@/lib/status-styles";
import { initials, timeAgo } from "@/lib/format";
import type { Profile } from "@/lib/database.types";

interface Row extends Profile {
  roles: { name: string } | null;
}

export default async function UsersPage() {
  const user = await getCurrentUser();
  const supabase = createClient();

  const { data: users } = user?.profile?.organization_id
    ? await supabase
        .from("profiles")
        .select("*, roles(name)")
        .eq("organization_id", user.profile.organization_id)
        .order("first_name")
    : { data: [] as Row[] };

  const columns: Column<Row>[] = [
    {
      header: "User",
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {initials(u.first_name, u.last_name)}
          </div>
          <div>
            <p className="font-medium text-navy-900">
              {u.first_name} {u.last_name}
            </p>
            <p className="text-xs text-slate-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    { header: "Job Title", cell: (u) => u.job_title ?? "—" },
    { header: "Role", cell: (u) => (u.is_org_admin ? "Company Admin" : u.roles?.name ?? "—") },
    { header: "Status", cell: (u) => <StatusBadge status={u.status} tone={USER_STATUS_TONE[u.status]} /> },
    { header: "Last Login", cell: (u) => timeAgo(u.last_login_at) },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        description="Everyone with access to Pixel Core in your organization."
        actions={
          user?.profile?.is_org_admin ? (
            <a href="/users/new" className="btn-primary">
              Invite User
            </a>
          ) : undefined
        }
      />
      {!users || users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users yet"
          description="Invite your team to start managing bookings, guests and rates together."
          actionLabel={user?.profile?.is_org_admin ? "Invite User" : undefined}
          actionHref={user?.profile?.is_org_admin ? "/users/new" : undefined}
        />
      ) : (
        <DataTable columns={columns} rows={users as Row[]} rowHref={(u) => `/users/${u.id}`} />
      )}
    </div>
  );
}
