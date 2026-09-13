import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { createRoomType } from "../actions";

export default async function NewRoomTypePage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const { data: properties } = user?.profile?.organization_id
    ? await supabase.from("properties").select("*").eq("organization_id", user.profile.organization_id).order("name")
    : { data: [] };

  return (
    <div className="max-w-xl">
      <PageHeader title="Add Room Type" description="Defines a category of rooms for a specific property." />
      <form action={createRoomType} className="card space-y-4 p-6">
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" required className="input" placeholder="Deluxe Beach Villa" />
          </div>
          <div>
            <label className="label" htmlFor="code">
              Code
            </label>
            <input id="code" name="code" required className="input" placeholder="DBV" maxLength={10} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="max_guests">
              Maximum guests
            </label>
            <input id="max_guests" name="max_guests" type="number" min={1} defaultValue={2} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="base_occupancy">
              Base occupancy
            </label>
            <input id="base_occupancy" name="base_occupancy" type="number" min={1} defaultValue={2} required className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea id="description" name="description" rows={3} className="input" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Create Room Type
          </button>
          <a href="/room-types" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
