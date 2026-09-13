import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { initials } from "@/lib/format";
import { updateUser } from "../actions";

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const currentUser = await getCurrentUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", params.id).maybeSingle();
  if (!profile) notFound();

  const [{ data: roles }, { data: properties }, { data: access }] = await Promise.all([
    supabase.from("roles").select("*").or(`organization_id.eq.${profile.organization_id ?? ""},organization_id.is.null`).order("name"),
    profile.organization_id
      ? supabase.from("properties").select("*").eq("organization_id", profile.organization_id).order("name")
      : Promise.resolve({ data: [] }),
    supabase.from("user_property_access").select("property_id").eq("user_id", profile.id),
  ]);

  const accessSet = new Set((access ?? []).map((a) => a.property_id));
  const canEdit = Boolean(currentUser?.profile?.is_org_admin);
  const updateWithId = updateUser.bind(null, profile.id);

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {initials(profile.first_name, profile.last_name)}
        </div>
        <PageHeader title={`${profile.first_name} ${profile.last_name}`.trim() || profile.email} description={profile.email} />
      </div>

      <form action={updateWithId} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="first_name">
              First name
            </label>
            <input id="first_name" name="first_name" defaultValue={profile.first_name} required disabled={!canEdit} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="last_name">
              Last name
            </label>
            <input id="last_name" name="last_name" defaultValue={profile.last_name} required disabled={!canEdit} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="job_title">
              Job title
            </label>
            <input id="job_title" name="job_title" defaultValue={profile.job_title ?? ""} disabled={!canEdit} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="department">
              Department
            </label>
            <input id="department" name="department" defaultValue={profile.department ?? ""} disabled={!canEdit} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="role_id">
              Role
            </label>
            <select id="role_id" name="role_id" defaultValue={profile.role_id ?? ""} disabled={!canEdit} className="input">
              <option value="">— Select role —</option>
              {(roles ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" defaultValue={profile.status} disabled={!canEdit} className="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input
            type="checkbox"
            name="is_org_admin"
            defaultChecked={profile.is_org_admin}
            disabled={!canEdit}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          Company Admin access (full access to all properties &amp; settings)
        </label>
        <div>
          <p className="label mb-2">Property access</p>
          <div className="space-y-1.5 rounded-lg border border-slate-200 p-3">
            {(properties ?? []).length === 0 && <p className="text-sm text-slate-400">No properties yet.</p>}
            {(properties ?? []).map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm text-navy-700">
                <input
                  type="checkbox"
                  name="property_ids"
                  value={p.id}
                  defaultChecked={accessSet.has(p.id)}
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600"
                />
                {p.name}
              </label>
            ))}
          </div>
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
