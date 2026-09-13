import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { inviteUser } from "../actions";

export default async function NewUserPage() {
  const user = await getCurrentUser();
  const supabase = createClient();

  const [{ data: roles }, { data: properties }] = await Promise.all([
    supabase.from("roles").select("*").or(`organization_id.eq.${user?.profile?.organization_id ?? ""},organization_id.is.null`).order("name"),
    user?.profile?.organization_id
      ? supabase.from("properties").select("*").eq("organization_id", user.profile.organization_id).order("name")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="max-w-xl">
      <PageHeader title="Invite User" description="They'll receive an email invitation to set their password." />
      <form action={inviteUser} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="first_name">
              First name
            </label>
            <input id="first_name" name="first_name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="last_name">
              Last name
            </label>
            <input id="last_name" name="last_name" required className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="job_title">
              Job title
            </label>
            <input id="job_title" name="job_title" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="department">
              Department
            </label>
            <input id="department" name="department" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="role_id">
            Role
          </label>
          <select id="role_id" name="role_id" className="input">
            <option value="">— Select role —</option>
            {(roles ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input type="checkbox" name="is_org_admin" className="h-4 w-4 rounded border-slate-300 text-brand-600" />
          Grant Company Admin access (full access to all properties &amp; settings)
        </label>
        <div>
          <p className="label mb-2">Property access</p>
          <div className="space-y-1.5 rounded-lg border border-slate-200 p-3">
            {(properties ?? []).length === 0 && <p className="text-sm text-slate-400">No properties yet.</p>}
            {(properties ?? []).map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm text-navy-700">
                <input type="checkbox" name="property_ids" value={p.id} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Send Invite
          </button>
          <a href="/users" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
