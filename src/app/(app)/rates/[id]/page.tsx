import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { updateRatePlan } from "../actions";

export default async function RateDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  const { data: rate } = await supabase.from("rate_plans").select("*").eq("id", params.id).maybeSingle();
  if (!rate) notFound();

  const orgId = user?.profile?.organization_id;
  const [{ data: properties }, { data: roomTypes }, { data: agents }] = await Promise.all([
    orgId ? supabase.from("properties").select("*").eq("organization_id", orgId).order("name") : Promise.resolve({ data: [] }),
    supabase.from("room_types").select("*").eq("property_id", rate.property_id).order("name"),
    orgId ? supabase.from("agents").select("*").eq("organization_id", orgId).order("company_name") : Promise.resolve({ data: [] }),
  ]);

  const updateWithId = updateRatePlan.bind(null, rate.id);

  return (
    <div className="max-w-2xl">
      <PageHeader title={rate.name} description={`Rate Engine · ${rate.rate_type}`} />
      <form action={updateWithId} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="name">
              Rate name
            </label>
            <input id="name" name="name" defaultValue={rate.name} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="rate_type">
              Rate type
            </label>
            <select id="rate_type" name="rate_type" defaultValue={rate.rate_type} className="input">
              {["public", "direct", "agent", "b2b", "promotion", "package", "corporate", "special"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="property_id">
              Property
            </label>
            <select id="property_id" name="property_id" defaultValue={rate.property_id} required className="input">
              {(properties ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="room_type_id">
              Room type
            </label>
            <select id="room_type_id" name="room_type_id" defaultValue={rate.room_type_id ?? ""} className="input">
              <option value="">All room types</option>
              {(roomTypes ?? []).map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="meal_plan">
              Meal plan
            </label>
            <input id="meal_plan" name="meal_plan" defaultValue={rate.meal_plan ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="market">
              Market
            </label>
            <input id="market" name="market" defaultValue={rate.market ?? ""} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="agent_id">
            Agent
          </label>
          <select id="agent_id" name="agent_id" defaultValue={rate.agent_id ?? ""} className="input">
            <option value="">— None —</option>
            {(agents ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.company_name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="currency">
              Currency
            </label>
            <input id="currency" name="currency" defaultValue={rate.currency} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="amount">
              Amount
            </label>
            <input id="amount" name="amount" type="number" step="0.01" defaultValue={rate.amount} required className="input" />
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="min_stay">
              Minimum stay
            </label>
            <input id="min_stay" name="min_stay" type="number" defaultValue={rate.min_stay ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="max_stay">
              Maximum stay
            </label>
            <input id="max_stay" name="max_stay" type="number" defaultValue={rate.max_stay ?? ""} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="cancellation_policy">
            Cancellation policy
          </label>
          <textarea id="cancellation_policy" name="cancellation_policy" defaultValue={rate.cancellation_policy ?? ""} rows={2} className="input" />
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
