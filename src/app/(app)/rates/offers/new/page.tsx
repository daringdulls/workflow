import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { createOffer } from "../actions";

export default async function NewOfferPage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const { data: properties } = user?.profile?.organization_id
    ? await supabase.from("properties").select("*").eq("organization_id", user.profile.organization_id).order("name")
    : { data: [] };

  return (
    <div className="max-w-xl">
      <PageHeader title="Add Offer" description="Stay-length or promo-code discounts the AI agent can apply automatically." />
      <form action={createOffer} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">
            Offer name
          </label>
          <input id="name" name="name" required className="input" placeholder="Stay 5+ Nights" />
        </div>
        <div>
          <label className="label" htmlFor="property_id">
            Property
          </label>
          <select id="property_id" name="property_id" className="input">
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
          <textarea id="description" name="description" rows={2} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="discount_type">
              Discount type
            </label>
            <select id="discount_type" name="discount_type" className="input" defaultValue="percentage">
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed amount</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="discount_value">
              Discount value
            </label>
            <input id="discount_value" name="discount_value" type="number" step="0.01" required className="input" placeholder="10" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="trigger_min_nights">
              Minimum nights to trigger (optional)
            </label>
            <input id="trigger_min_nights" name="trigger_min_nights" type="number" min={1} className="input" placeholder="5" />
          </div>
          <div>
            <label className="label" htmlFor="promo_code">
              Promo code (optional)
            </label>
            <input id="promo_code" name="promo_code" className="input" placeholder="WINTER10" />
          </div>
        </div>
        <div>
          <p className="label mb-2">Applies to</p>
          <div className="flex flex-wrap gap-3">
            {["accommodation", "diving", "transfer"].map((a) => (
              <label key={a} className="flex items-center gap-1.5 text-sm text-navy-700">
                <input type="checkbox" name="applies_to" value={a} defaultChecked={a === "accommodation"} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
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
            <input id="start_date" name="start_date" type="date" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="end_date">
              End date
            </label>
            <input id="end_date" name="end_date" type="date" required className="input" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Create Offer
          </button>
          <a href="/rates?tab=offers" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
