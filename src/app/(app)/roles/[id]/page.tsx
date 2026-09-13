import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { titleCase } from "@/lib/format";
import { updateRolePermissions } from "../actions";

export default async function RoleDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  const { data: role } = await supabase.from("roles").select("*").eq("id", params.id).maybeSingle();
  if (!role) notFound();

  const [{ data: permissions }, { data: granted }] = await Promise.all([
    supabase.from("permissions").select("*").order("module").order("label"),
    supabase.from("role_permissions").select("permission_id").eq("role_id", role.id),
  ]);

  const grantedSet = new Set((granted ?? []).map((g) => g.permission_id));
  const byModule = new Map<string, typeof permissions>();
  for (const p of permissions ?? []) {
    if (!byModule.has(p.module)) byModule.set(p.module, []);
    byModule.get(p.module)!.push(p);
  }

  const canEdit = Boolean(user?.profile?.is_org_admin);
  const updateWithId = updateRolePermissions.bind(null, role.id);

  return (
    <div className="max-w-2xl">
      <PageHeader title={role.name} description={role.description ?? "Module, page and action-level permissions for this role."} />

      <form action={updateWithId} className="space-y-4">
        {Array.from(byModule.entries()).map(([module, perms]) => (
          <div key={module} className="card p-5">
            <p className="mb-3 text-sm font-semibold text-navy-900">{titleCase(module)}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(perms ?? []).map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-navy-700">
                  <input
                    type="checkbox"
                    name="permission_ids"
                    value={p.id}
                    defaultChecked={grantedSet.has(p.id)}
                    disabled={!canEdit}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        ))}
        {canEdit && (
          <button type="submit" className="btn-primary">
            Save permissions
          </button>
        )}
      </form>
    </div>
  );
}
