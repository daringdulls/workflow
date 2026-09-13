import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { createDiveRate } from "../actions";

export default async function NewDiveRatePage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const { data: properties } = user?.profile?.organization_id
    ? await supabase.from("properties").select("*").eq("organization_id", user.profile.organization_id).order("name")
    : { data: [] };

  return (
    <div className="max-w-xl">
      <PageHeader title="Add Dive Rate" description="A dive package the AI agent and staff can quote directly." />
      <form action={createDiveRate} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="property_id">
            Property
          </label>
          <select id="property_id" name="property_id" required className="input">
            <option value="">— Select property —</option>
            {(properties ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="package_name">
            Package name
          </label>
          <input id="package_name" name="package_name" required className="input" placeholder="18-Dive Package" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="dives_included">
              Dives included
            </label>
            <input id="dives_included" name="dives_included" type="number" min={1} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="min_participants">
              Minimum participants
            </label>
            <input id="min_participants" name="min_participants" type="number" min={1} defaultValue={1} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="currency">
              Currency
            </label>
            <input id="currency" name="currency" defaultValue="USD" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="price_per_person">
              Price per person
            </label>
            <input id="price_per_person" name="price_per_person" type="number" step="0.01" required className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="start_date">
              Start date
            </label>
            <input id="start_date" name="start_date" type="date" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="end_date">
              End date
            </label>
            <input id="end_date" name="end_date" type="date" required className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={2} className="input" placeholder="Equipment included, certification requirements, etc." />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Create Dive Rate
          </button>
          <a href="/rates?tab=diving" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
