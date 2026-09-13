import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { updateOrganization } from "../actions";

export default async function OrganizationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  const { data: org } = await supabase.from("organizations").select("*").eq("id", params.id).maybeSingle();
  if (!org) notFound();

  const { count: propertyCount } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id);
  const { count: userCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id);

  const canEdit = Boolean(user?.profile?.is_org_admin && user.profile.organization_id === org.id);
  const updateWithId = updateOrganization.bind(null, org.id);

  return (
    <div className="max-w-2xl">
      <PageHeader title={org.name} description={`Organization · ${org.slug}`} />

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-400">Properties</p>
          <p className="text-xl font-semibold text-navy-900">{propertyCount ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Users</p>
          <p className="text-xl font-semibold text-navy-900">{userCount ?? 0}</p>
        </div>
      </div>

      <form action={updateWithId} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">
            Organization name
          </label>
          <input id="name" name="name" defaultValue={org.name} required disabled={!canEdit} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={org.status} disabled={!canEdit} className="input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {canEdit && (
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        )}
      </form>
    </div>
  );
}
