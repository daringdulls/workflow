import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { updateRoomType } from "../actions";

export default async function RoomTypeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: roomType } = await supabase.from("room_types").select("*, properties(name)").eq("id", params.id).maybeSingle();
  if (!roomType) notFound();

  const updateWithId = updateRoomType.bind(null, roomType.id);

  return (
    <div className="max-w-xl">
      <PageHeader title={roomType.name} description={`Room Type · ${(roomType as any).properties?.name ?? "—"}`} />
      <form action={updateWithId} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" defaultValue={roomType.name} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="code">
              Code
            </label>
            <input id="code" name="code" defaultValue={roomType.code} required className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="max_guests">
              Maximum guests
            </label>
            <input id="max_guests" name="max_guests" type="number" min={1} defaultValue={roomType.max_guests} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="base_occupancy">
              Base occupancy
            </label>
            <input id="base_occupancy" name="base_occupancy" type="number" min={1} defaultValue={roomType.base_occupancy} required className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea id="description" name="description" defaultValue={roomType.description ?? ""} rows={3} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={roomType.status} className="input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Save changes
        </button>
      </form>
    </div>
  );
}
