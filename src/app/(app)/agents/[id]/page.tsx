import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { updateAgent } from "../actions";

export default async function AgentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: agent } = await supabase.from("agents").select("*").eq("id", params.id).maybeSingle();
  if (!agent) notFound();

  const { data: rates } = await supabase.from("rate_plans").select("*, properties(name), room_types(name)").eq("agent_id", agent.id);
  const updateWithId = updateAgent.bind(null, agent.id);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={agent.company_name} description={`Agent · ${agent.agent_code}`} />

      <form action={updateWithId} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="company_name">
              Company name
            </label>
            <input id="company_name" name="company_name" defaultValue={agent.company_name} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="agent_code">
              Agent code
            </label>
            <input id="agent_code" name="agent_code" defaultValue={agent.agent_code} required className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="contact_person">
              Contact person
            </label>
            <input id="contact_person" name="contact_person" defaultValue={agent.contact_person ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="market">
              Market
            </label>
            <input id="market" name="market" defaultValue={agent.market ?? ""} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" defaultValue={agent.email ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" defaultValue={agent.phone ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="whatsapp">
              WhatsApp
            </label>
            <input id="whatsapp" name="whatsapp" defaultValue={agent.whatsapp ?? ""} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="country">
              Country
            </label>
            <input id="country" name="country" defaultValue={agent.country ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="credit_limit">
              Credit limit
            </label>
            <input id="credit_limit" name="credit_limit" type="number" step="0.01" defaultValue={agent.credit_limit ?? ""} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="payment_terms">
            Payment terms
          </label>
          <input id="payment_terms" name="payment_terms" defaultValue={agent.payment_terms ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" defaultValue={agent.notes ?? ""} rows={2} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={agent.status} className="input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Save changes
        </button>
      </form>

      <div>
        <p className="mb-3 text-sm font-semibold text-navy-900">Assigned Rates</p>
        {!rates || rates.length === 0 ? (
          <p className="card p-5 text-sm text-slate-400">No agent-specific rates yet.</p>
        ) : (
          <div className="card divide-y divide-slate-100">
            {rates.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  {r.name} · {r.properties?.name} · {r.room_types?.name ?? "All room types"}
                </span>
                <span className="font-medium text-navy-900">
                  {r.currency} {r.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
