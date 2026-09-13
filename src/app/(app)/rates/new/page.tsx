import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { createRatePlan } from "../actions";

export default async function NewRatePage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const orgId = user?.profile?.organization_id;

  const [{ data: properties }, { data: roomTypes }, { data: agents }] = await Promise.all([
    orgId ? supabase.from("properties").select("*").eq("organization_id", orgId).order("name") : Promise.resolve({ data: [] }),
    orgId
      ? supabase.from("room_types").select("*, properties(name)").in("property_id", (await supabase.from("properties").select("id").eq("organization_id", orgId)).data?.map((p) => p.id) ?? [])
      : Promise.resolve({ data: [] }),
    orgId ? supabase.from("agents").select("*").eq("organization_id", orgId).order("company_name") : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Rate" description="Rates apply to a property, optionally scoped to a room type or agent." />
      <form action={createRatePlan} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="name">
              Rate name
            </label>
            <input id="name" name="name" required className="input" placeholder="September Promotion" />
          </div>
          <div>
            <label className="label" htmlFor="rate_type">
              Rate type
            </label>
            <select id="rate_type" name="rate_type" className="input" defaultValue="public">
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
            <label className="label" htmlFor="room_type_id">
              Room type
            </label>
            <select id="room_type_id" name="room_type_id" className="input">
              <option value="">All room types</option>
              {(roomTypes ?? []).map((rt: any) => (
                <option key={rt.id} value={rt.id}>
                  {rt.properties?.name} — {rt.name}
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
            <input id="meal_plan" name="meal_plan" className="input" placeholder="Half Board" />
          </div>
          <div>
            <label className="label" htmlFor="market">
              Market
            </label>
            <input id="market" name="market" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="agent_id">
            Agent (for agent-specific rates)
          </label>
          <select id="agent_id" name="agent_id" className="input">
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
            <input id="currency" name="currency" defaultValue="USD" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="amount">
              Amount
            </label>
            <input id="amount" name="amount" type="number" step="0.01" required className="input" />
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="min_stay">
              Minimum stay (nights)
            </label>
            <input id="min_stay" name="min_stay" type="number" min={1} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="max_stay">
              Maximum stay (nights)
            </label>
            <input id="max_stay" name="max_stay" type="number" min={1} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="booking_window">
            Booking window
          </label>
          <input id="booking_window" name="booking_window" className="input" placeholder="Book 14 days in advance" />
        </div>
        <div>
          <label className="label" htmlFor="cancellation_policy">
            Cancellation policy
          </label>
          <textarea id="cancellation_policy" name="cancellation_policy" rows={2} className="input" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Create Rate
          </button>
          <a href="/rates" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
