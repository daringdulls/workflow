import { PageHeader } from "@/components/ui/page-header";
import { createAgent } from "../actions";

export default function NewAgentPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="Add Agent" description="Travel agents and companies that book on behalf of guests." />
      <form action={createAgent} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="company_name">
              Company name
            </label>
            <input id="company_name" name="company_name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="agent_code">
              Agent code
            </label>
            <input id="agent_code" name="agent_code" required className="input" maxLength={12} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="contact_person">
              Contact person
            </label>
            <input id="contact_person" name="contact_person" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="market">
              Market
            </label>
            <input id="market" name="market" className="input" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="whatsapp">
              WhatsApp
            </label>
            <input id="whatsapp" name="whatsapp" className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="country">
              Country
            </label>
            <input id="country" name="country" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="credit_limit">
              Credit limit
            </label>
            <input id="credit_limit" name="credit_limit" type="number" step="0.01" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="payment_terms">
            Payment terms
          </label>
          <input id="payment_terms" name="payment_terms" className="input" placeholder="Net 30" />
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={2} className="input" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Create Agent
          </button>
          <a href="/agents" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
