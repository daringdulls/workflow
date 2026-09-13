import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { updateTransferRate } from "../actions";

export default async function TransferRateDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: rate } = await supabase.from("transfer_rates").select("*, properties(name)").eq("id", params.id).maybeSingle();
  if (!rate) notFound();

  const updateWithId = updateTransferRate.bind(null, rate.id);

  return (
    <div className="max-w-xl">
      <PageHeader title={rate.transfer_type} description={`Transfer Rate · ${(rate as any).properties?.name}`} />
      <form action={updateWithId} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="transfer_type">
              Transfer type
            </label>
            <input id="transfer_type" name="transfer_type" defaultValue={rate.transfer_type} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="direction">
              Direction
            </label>
            <select id="direction" name="direction" defaultValue={rate.direction} className="input">
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
