import { PageHeader } from "@/components/ui/page-header";
import { createProperty } from "../actions";

export default function NewPropertyPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="Add Property" description="Properties belong to your organization and hold rooms, rates and reservations." />
      <form action={createProperty} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">
            Property name
          </label>
          <input id="name" name="name" required className="input" placeholder="Cozy Roots Fuvahmulah" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="code">
              Code
            </label>
            <input id="code" name="code" required className="input" placeholder="CRF" maxLength={10} />
          </div>
          <div>
            <label className="label" htmlFor="currency">
              Currency
            </label>
            <input id="currency" name="currency" defaultValue="USD" required className="input" maxLength={3} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">
            Address
          </label>
          <input id="address" name="address" className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="city">
              City / Island
            </label>
            <input id="city" name="city" className="input" placeholder="Fuvahmulah" />
          </div>
          <div>
            <label className="label" htmlFor="country">
              Country
            </label>
            <input id="country" name="country" defaultValue="Maldives" className="input" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Create Property
          </button>
          <a href="/properties" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
