import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { updateRoom } from "../actions";

export default async function RoomDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: room } = await supabase.from("rooms").select("*, properties(name), room_types(name)").eq("id", params.id).maybeSingle();
  if (!room) notFound();

  const updateWithId = updateRoom.bind(null, room.id);

  return (
    <div className="max-w-lg">
      <PageHeader title={`Room ${room.room_number}`} description={`${(room as any).properties?.name} · ${(room as any).room_types?.name}`} />
      <form action={updateWithId} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="room_number">
              Room number
            </label>
            <input id="room_number" name="room_number" defaultValue={room.room_number} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="floor">
              Floor
            </label>
            <input id="floor" name="floor" defaultValue={room.floor ?? ""} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={room.status} className="input">
            {["available", "occupied", "dirty", "cleaning", "maintenance", "out_of_order"].map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Save changes
        </button>
      </form>
    </div>
  );
}
