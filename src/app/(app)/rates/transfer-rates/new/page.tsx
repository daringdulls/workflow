import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { createTransferRate } from "../actions";

export default async function NewTransferRatePage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const { data: properties } = user?.profile?.organization_id
    ? await supabase.from("properties").select("*").eq("organization_id", user.profile.organization_id).order("name")
    : { data: [] };

  return (
    <div className="max-w-xl">
      <PageHeader title="Add Transfer Rate" description="Domestic flights, speedboats, seaplanes — priced per person." />
      <form action={createTransferRate} className="card space-y-4 p-6">
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="transfer_type">
              Transfer type
            </label>
            <input id="transfer_type" name="transfer_type" required className="input" placeholder="Domestic Flight" />
          </div>
          <div>
            <label className="label" htmlFor="direction">
              Direction
            </label>
            <select id="direction" name="direction" className="input" defaultValue="one_way">
              <option value="one_way">One way</option>
              <option value="return">Return</option>
            </select>
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
          <textarea id="notes" name="notes" rows={2} className="input" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Create Transfer Rate
          </button>
          <a href="/rates?tab=transfers" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
