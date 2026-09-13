import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { updateProperty } from "../actions";

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  const { data: property } = await supabase.from("properties").select("*").eq("id", params.id).maybeSingle();
  if (!property) notFound();

  const [{ count: roomCount }, { count: roomTypeCount }, { count: reservationCount }] = await Promise.all([
    supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", property.id),
    supabase.from("room_types").select("id", { count: "exact", head: true }).eq("property_id", property.id),
    supabase.from("reservations").select("id", { count: "exact", head: true }).eq("property_id", property.id),
  ]);

  const canEdit = Boolean(user?.profile?.is_org_admin);
  const updateWithId = updateProperty.bind(null, property.id);

  return (
    <div className="max-w-2xl">
      <PageHeader title={property.name} description={`Property · ${property.code}`} />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Link href={`/rooms?property=${property.id}`} className="card p-4 hover:shadow-card-hover">
          <p className="text-xs text-slate-400">Rooms</p>
          <p className="text-xl font-semibold text-navy-900">{roomCount ?? 0}</p>
        </Link>
        <Link href={`/room-types?property=${property.id}`} className="card p-4 hover:shadow-card-hover">
          <p className="text-xs text-slate-400">Room Types</p>
          <p className="text-xl font-semibold text-navy-900">{roomTypeCount ?? 0}</p>
        </Link>
        <Link href={`/reservations?property=${property.id}`} className="card p-4 hover:shadow-card-hover">
          <p className="text-xs text-slate-400">Reservations</p>
          <p className="text-xl font-semibold text-navy-900">{reservationCount ?? 0}</p>
        </Link>
      </div>

      <form action={updateWithId} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">
            Property name
          </label>
          <input id="name" name="name" defaultValue={property.name} required disabled={!canEdit} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="code">
              Code
            </label>
            <input id="code" name="code" defaultValue={property.code} required disabled={!canEdit} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="currency">
              Currency
            </label>
            <input id="currency" name="currency" defaultValue={property.currency} required disabled={!canEdit} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">
            Address
          </label>
          <input id="address" name="address" defaultValue={property.address ?? ""} disabled={!canEdit} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="city">
              City / Island
            </label>
            <input id="city" name="city" defaultValue={property.city ?? ""} disabled={!canEdit} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="country">
              Country
            </label>
            <input id="country" name="country" defaultValue={property.country ?? ""} disabled={!canEdit} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={property.status} disabled={!canEdit} className="input">
            <option value="active">Active</option>
            <option value="inactive">Inactive (deactivated)</option>
          </select>
        </div>
        {canEdit && (
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        )}
      </form>
    </div>
  );
}
