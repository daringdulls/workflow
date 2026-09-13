import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { createRoom } from "../actions";

export default async function NewRoomPage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const propertyIds = user?.properties.map((p) => p.id) ?? [];
  const { data: roomTypes } = propertyIds.length
    ? await supabase.from("room_types").select("*, properties(name)").in("property_id", propertyIds).order("name")
    : { data: [] };

  return (
    <div className="max-w-lg">
      <PageHeader title="Add Room" description="Physical rooms belong to a room type within a property." />
      <form action={createRoom} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="room_type_ref">
            Room type
          </label>
          <select id="room_type_ref" name="room_type_ref" required className="input">
            <option value="">— Select room type —</option>
            {(roomTypes ?? []).map((rt: any) => (
              <option key={rt.id} value={`${rt.property_id}:${rt.id}`}>
                {rt.properties?.name} — {rt.name}
              </option>
            ))}
          </select>
          {(!roomTypes || roomTypes.length === 0) && (
            <p className="mt-1 text-xs text-slate-400">
              No room types yet. <a href="/room-types/new" className="text-brand-600 underline">Create one first</a>.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="room_number">
              Room number
            </label>
            <input id="room_number" name="room_number" required className="input" placeholder="101" />
          </div>
          <div>
            <label className="label" htmlFor="floor">
              Floor
            </label>
            <input id="floor" name="floor" className="input" placeholder="1" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Create Room
          </button>
          <a href="/rooms" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
