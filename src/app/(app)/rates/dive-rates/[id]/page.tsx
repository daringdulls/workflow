import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { updateDiveRate } from "../actions";

export default async function DiveRateDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: rate } = await supabase.from("dive_rates").select("*, properties(name)").eq("id", params.id).maybeSingle();
  if (!rate) notFound();

  const updateWithId = updateDiveRate.bind(null, rate.id);

  return (
    <div className="max-w-xl">
      <PageHeader title={rate.package_name} description={`Dive Rate · ${(rate as any).properties?.name}`} />
      <form action={updateWithId} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="package_name">
            Package name
          </label>
          <input id="package_name" name="package_name" defaultValue={rate.package_name} required className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="dives_included">
              Dives included
            </label>
            <input id="dives_included" name="dives_included" type="number" min={1} defaultValue={rate.dives_included} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="min_participants">
              Minimum participants
            </label>
            <input id="min_participants" name="min_participants" type="number" min={1} defaultValue={rate.min_participants} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="currency">
              Currency
            </label>
            <input id="currency" name="currency" defaultValue={rate.currency} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="price_per_person">
              Price per person
            </label>
            <input id="price_per_person" name="price_per_person" type="number" step="0.01" defaultValue={rate.price_per_person} required className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="start_date">
              Start date
            </label>
            <input id="start_date" name="start_date" type="date" defaultValue={rate.start_date} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="end_date">
              End date
            </label>
            <input id="end_date" name="end_date" type="date" defaultValue={rate.end_date} required className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" defaultValue={rate.notes ?? ""} rows={2} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={rate.status} className="input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Save changes
        </button>
      </form>
    </div>
  );
}
