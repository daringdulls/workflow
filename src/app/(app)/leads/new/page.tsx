import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { createLead } from "../actions";

export default async function NewLeadPage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const orgId = user?.profile?.organization_id;
  const { data: properties } = orgId ? await supabase.from("properties").select("*").eq("organization_id", orgId).order("name") : { data: [] };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Lead" description="Log a new inquiry into the sales pipeline." />
      <form action={createLead} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="guest_name">
              Guest / lead name
            </label>
            <input id="guest_name" name="guest_name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="source">
              Source
            </label>
            <select id="source" name="source" className="input" defaultValue="website">
              {["whatsapp", "instagram", "facebook", "website", "email", "google", "tripadvisor", "phone", "walk_in", "referral", "tiktok", "agent", "other"].map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="contact_email">
              Email
            </label>
            <input id="contact_email" name="contact_email" type="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="contact_phone">
              Phone
            </label>
            <input id="contact_phone" name="contact_phone" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="property_id">
            Property of interest
          </label>
          <select id="property_id" name="property_id" className="input">
            <option value="">— Any —</option>
            {(properties ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="label" htmlFor="travel_start_date">
              Travel from
            </label>
            <input id="travel_start_date" name="travel_start_date" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="travel_end_date">
              Travel to
            </label>
            <input id="travel_end_date" name="travel_end_date" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="adults">
              Adults
            </label>
            <input id="adults" name="adults" type="number" min={1} defaultValue={1} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="children">
              Children
            </label>
            <input id="children" name="children" type="number" min={0} defaultValue={0} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="requirements">
            Requirements
          </label>
          <textarea id="requirements" name="requirements" rows={2} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="follow_up_date">
              Follow-up date
            </label>
            <input id="follow_up_date" name="follow_up_date" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="estimated_value">
              Estimated value (USD)
            </label>
            <input id="estimated_value" name="estimated_value" type="number" step="0.01" className="input" />
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
            Create Lead
          </button>
          <a href="/leads" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
