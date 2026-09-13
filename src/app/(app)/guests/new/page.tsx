import { PageHeader } from "@/components/ui/page-header";
import { createGuest } from "../actions";

export default function NewGuestPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Guest" description="Creates a record in the shared Pixel guest master." />
      <form action={createGuest} className="card space-y-5 p-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="label" htmlFor="title">
              Title
            </label>
            <select id="title" name="title" className="input">
              <option value="">—</option>
              <option>Mr</option>
              <option>Mrs</option>
              <option>Ms</option>
              <option>Dr</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="first_name">
              First name
            </label>
            <input id="first_name" name="first_name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="last_name">
              Last name
            </label>
            <input id="last_name" name="last_name" required className="input" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="gender">
              Gender
            </label>
            <select id="gender" name="gender" className="input">
              <option value="">—</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="date_of_birth">
              Date of birth
            </label>
            <input id="date_of_birth" name="date_of_birth" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="nationality">
              Nationality
            </label>
            <input id="nationality" name="nationality" className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="passport_number">
              Passport number
            </label>
            <input id="passport_number" name="passport_number" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="passport_expiry">
              Passport expiry
            </label>
            <input id="passport_expiry" name="passport_expiry" type="date" className="input" />
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

        <div>
          <label className="label" htmlFor="address">
            Address
          </label>
          <input id="address" name="address" className="input" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="country">
              Country
            </label>
            <input id="country" name="country" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="preferred_language">
              Preferred language
            </label>
            <input id="preferred_language" name="preferred_language" className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="dietary_requirements">
              Dietary requirements
            </label>
            <textarea id="dietary_requirements" name="dietary_requirements" rows={2} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="special_requirements">
              Special requirements
            </label>
            <textarea id="special_requirements" name="special_requirements" rows={2} className="input" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={2} className="input" />
        </div>

        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input type="checkbox" name="vip_status" className="h-4 w-4 rounded border-slate-300 text-brand-600" />
          Mark as VIP
        </label>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Create Guest
          </button>
          <a href="/guests" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
