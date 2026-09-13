import { CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { recalculateAvailability, overrideAvailability } from "./actions";

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: { property?: string; room_type?: string };
}) {
  const user = await getCurrentUser();
  const supabase = createClient();
  const orgId = user?.profile?.organization_id;

  const { data: properties } = orgId ? await supabase.from("properties").select("*").eq("organization_id", orgId).order("name") : { data: [] };
  const propertyId = searchParams.property ?? properties?.[0]?.id ?? "";

  const { data: roomTypes } = propertyId
    ? await supabase.from("room_types").select("*").eq("property_id", propertyId).order("name")
    : { data: [] };
  const roomTypeId = searchParams.room_type ?? roomTypes?.[0]?.id ?? "";

  const today = new Date().toISOString().slice(0, 10);
  const rangeEnd = addDays(today, 13);

  const { data: rows } = propertyId && roomTypeId
    ? await supabase
        .from("availability_daily")
        .select("*")
        .eq("property_id", propertyId)
        .eq("room_type_id", roomTypeId)
        .gte("date", today)
        .lte("date", rangeEnd)
        .order("date")
    : { data: [] };

  return (
    <div>
      <PageHeader title="Availability" description="Live inventory calculated from confirmed, tentative and out-of-order rooms." />

      <form className="mb-4 flex flex-wrap items-end gap-3" action="/availability" method="get">
        <div>
          <label className="label" htmlFor="property">
            Property
          </label>
          <select id="property" name="property" defaultValue={propertyId} className="input">
            {(properties ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="room_type">
            Room type
          </label>
          <select id="room_type" name="room_type" defaultValue={roomTypeId} className="input">
            {(roomTypes ?? []).map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          View
        </button>
      </form>

      {!propertyId || !roomTypeId ? (
        <EmptyState icon={CalendarCheck} title="Add a property and room type first" description="Availability is calculated per property and room type." />
      ) : (
        <>
          <form action={recalculateAvailability} className="mb-4">
            <input type="hidden" name="property_id" value={propertyId} />
            <input type="hidden" name="room_type_id" value={roomTypeId} />
            <input type="hidden" name="start" value={today} />
            <input type="hidden" name="end" value={rangeEnd} />
            <button type="submit" className="btn-secondary">
              Recalculate from reservations
            </button>
          </form>

          {!rows || rows.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No availability calculated yet" description="Click “Recalculate from reservations” to build the next 14 days of inventory." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Confirmed</th>
                    <th className="px-4 py-3">Tentative</th>
                    <th className="px-4 py-3">Out of Order</th>
                    <th className="px-4 py-3">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-navy-900">{formatDate(row.date)}</td>
                      <td className="px-4 py-2.5">{row.total_inventory}</td>
                      <td className="px-4 py-2.5">{row.confirmed_rooms}</td>
                      <td className="px-4 py-2.5">{row.tentative_rooms}</td>
                      <td className="px-4 py-2.5">{row.out_of_order_rooms}</td>
                      <td className={`px-4 py-2.5 font-semibold ${row.available_rooms <= 0 ? "text-danger-600" : "text-success-600"}`}>
                        {row.available_rooms}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 card p-5">
            <p className="mb-1 text-sm font-semibold text-navy-900">Manual Override</p>
            <p className="mb-3 text-xs text-slate-400">Adjusts inventory for a single date. Every override is written to the audit log.</p>
            <form action={overrideAvailability} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input type="hidden" name="property_id" value={propertyId} />
              <input type="hidden" name="room_type_id" value={roomTypeId} />
              <input type="date" name="date" required className="input" min={today} />
              <input type="number" name="adjustment" required placeholder="e.g. -1 or +2" className="input" />
              <input type="text" name="reason" required placeholder="Reason" className="input sm:col-span-2" />
              <button type="submit" className="btn-secondary sm:col-span-4 sm:w-fit">
                Apply Override
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
