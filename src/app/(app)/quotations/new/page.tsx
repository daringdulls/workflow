import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { createQuotation } from "../actions";

export default async function NewQuotationPage({ searchParams }: { searchParams: { lead?: string } }) {
  const user = await getCurrentUser();
  const supabase = createClient();
  const orgId = user?.profile?.organization_id;

  const [{ data: properties }, { data: guests }, { data: lead }] = await Promise.all([
    orgId ? supabase.from("properties").select("*").eq("organization_id", orgId).order("name") : Promise.resolve({ data: [] }),
    orgId ? supabase.from("guests").select("id, first_name, last_name, guest_number").eq("organization_id", orgId).order("first_name") : Promise.resolve({ data: [] }),
    searchParams.lead ? supabase.from("leads").select("*").eq("id", searchParams.lead).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Quotation" description={lead ? `For lead: ${lead.guest_name}` : "Build a quote to send to the guest."} />
      <form action={createQuotation} className="card space-y-4 p-6">
        {lead && <input type="hidden" name="lead_id" value={lead.id} />}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="property_id">
              Property
            </label>
            <select id="property_id" name="property_id" required defaultValue={lead?.property_id ?? ""} className="input">
              <option value="">— Select property —</option>
              {(properties ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="guest_id">
              Guest
            </label>
            <select id="guest_id" name="guest_id" className="input">
              <option value="">— No guest linked yet —</option>
              {(guests ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.first_name} {g.last_name} ({g.guest_number})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="arrival_date">
              Arrival
            </label>
            <input id="arrival_date" name="arrival_date" type="date" defaultValue={lead?.travel_start_date ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="departure_date">
              Departure
            </label>
            <input id="departure_date" name="departure_date" type="date" defaultValue={lead?.travel_end_date ?? ""} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="meal_plan">
            Meal plan
          </label>
          <input id="meal_plan" name="meal_plan" className="input" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="accommodation_amount">
              Accommodation
            </label>
            <input id="accommodation_amount" name="accommodation_amount" type="number" step="0.01" defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="dive_amount">
              Dive
            </label>
            <input id="dive_amount" name="dive_amount" type="number" step="0.01" defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="transfer_amount">
              Transfers
            </label>
            <input id="transfer_amount" name="transfer_amount" type="number" step="0.01" defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="activities_amount">
              Activities
            </label>
            <input id="activities_amount" name="activities_amount" type="number" step="0.01" defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="domestic_flight_amount">
              Domestic flights
            </label>
            <input id="domestic_flight_amount" name="domestic_flight_amount" type="number" step="0.01" defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="extras_amount">
              Extras
            </label>
            <input id="extras_amount" name="extras_amount" type="number" step="0.01" defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="discount_amount">
              Discount
            </label>
            <input id="discount_amount" name="discount_amount" type="number" step="0.01" defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="tax_amount">
              Tax
            </label>
            <input id="tax_amount" name="tax_amount" type="number" step="0.01" defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="currency">
              Currency
            </label>
            <input id="currency" name="currency" defaultValue="USD" className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="expiry_date">
              Expiry date
            </label>
            <input id="expiry_date" name="expiry_date" type="date" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="terms">
            Terms
          </label>
          <textarea id="terms" name="terms" rows={2} className="input" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Save Draft
          </button>
          <a href="/quotations" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
