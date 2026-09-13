import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { updateOffer } from "../actions";

export default async function OfferDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  const { data: offer } = await supabase.from("offers").select("*").eq("id", params.id).maybeSingle();
  if (!offer) notFound();

  const { data: properties } = user?.profile?.organization_id
    ? await supabase.from("properties").select("*").eq("organization_id", user.profile.organization_id).order("name")
    : { data: [] };

  const updateWithId = updateOffer.bind(null, offer.id);

  return (
    <div className="max-w-xl">
      <PageHeader title={offer.name} description="Offer" />
      <form action={updateWithId} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">
            Offer name
          </label>
          <input id="name" name="name" defaultValue={offer.name} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="property_id">
            Property
          </label>
          <select id="property_id" name="property_id" defaultValue={offer.property_id ?? ""} className="input">
            <option value="">All properties</option>
            {(properties ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea id="description" name="description" defaultValue={offer.description ?? ""} rows={2} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="discount_type">
              Discount type
            </label>
            <select id="discount_type" name="discount_type" defaultValue={offer.discount_type} className="input">
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed amount</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="discount_value">
              Discount value
            </label>
            <input id="discount_value" name="discount_value" type="number" step="0.01" defaultValue={offer.discount_value} required className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="trigger_min_nights">
              Minimum nights to trigger
            </label>
            <input id="trigger_min_nights" name="trigger_min_nights" type="number" min={1} defaultValue={offer.trigger_min_nights ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="promo_code">
              Promo code
            </label>
            <input id="promo_code" name="promo_code" defaultValue={offer.promo_code ?? ""} className="input" />
          </div>
        </div>
        <div>
          <p className="label mb-2">Applies to</p>
          <div className="flex flex-wrap gap-3">
            {["accommodation", "diving", "transfer"].map((a) => (
              <label key={a} className="flex items-center gap-1.5 text-sm text-navy-700">
                <input type="checkbox" name="applies_to" value={a} defaultChecked={offer.applies_to.includes(a)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                {a}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="start_date">
              Start date
            </label>
            <input id="start_date" name="start_date" type="date" defaultValue={offer.start_date} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="end_date">
              End date
            </label>
            <input id="end_date" name="end_date" type="date" defaultValue={offer.end_date} required className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={offer.status} className="input">
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
