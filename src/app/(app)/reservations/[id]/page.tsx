import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { BOOKING_STATUS_TONE, PAYMENT_STATUS_TONE } from "@/lib/status-styles";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import { updateReservationOperations } from "../actions";

export default async function ReservationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  const { data: r } = await supabase
    .from("reservations")
    .select("*, guests(*), properties(name), room_types(name), rooms(room_number), agents(company_name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!r) notFound();

  const { data: rooms } = await supabase.from("rooms").select("*").eq("property_id", r.property_id).order("room_number");

  const updateWithId = updateReservationOperations.bind(null, r.id);
  const canEdit = Boolean(user?.profile);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={r.booking_number}
        description={r.external_booking_id ? `External ID: ${r.external_booking_id}` : "Created directly in Pixel Core"}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={r.booking_status} tone={BOOKING_STATUS_TONE[r.booking_status]} />
            <StatusBadge status={r.payment_status} tone={PAYMENT_STATUS_TONE[r.payment_status]} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <p className="text-sm font-semibold text-navy-900">Stay Details</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Info label="Guest" value={r.guests ? `${r.guests.first_name} ${r.guests.last_name}` : "—"} href={r.guests ? `/guests/${r.guest_id}` : undefined} />
            <Info label="Property" value={r.properties?.name ?? "—"} />
            <Info label="Room Type" value={r.room_types?.name ?? "—"} />
            <Info label="Room" value={r.rooms?.room_number ?? "Unassigned"} />
            <Info label="Arrival" value={formatDate(r.arrival_date)} />
            <Info label="Departure" value={formatDate(r.departure_date)} />
            <Info label="Nights" value={String(r.nights)} />
            <Info label="Adults / Children / Infants" value={`${r.adults} / ${r.children} / ${r.infants}`} />
            <Info label="Meal Plan" value={r.meal_plan ?? "—"} />
            <Info label="Source" value={titleCase(r.booking_source)} />
            <Info label="Market" value={r.market ?? "—"} />
            <Info label="Agent" value={r.agents?.company_name ?? "Direct"} />
          </div>
          {r.special_requests && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400">Special requests</p>
              <p className="text-sm text-navy-800">{r.special_requests}</p>
            </div>
          )}
        </div>

        <div className="card space-y-3 p-5">
          <p className="text-sm font-semibold text-navy-900">Financials</p>
          <Money label="Accommodation" value={r.accommodation_amount} currency={r.currency} />
          <Money label="Dive" value={r.dive_amount} currency={r.currency} />
          <Money label="Transfer" value={r.transfer_amount} currency={r.currency} />
          <Money label="Extras" value={r.extra_amount} currency={r.currency} />
          <Money label="Domestic Flight" value={r.domestic_flight_amount} currency={r.currency} />
          <Money label="Discount" value={-r.discount_amount} currency={r.currency} />
          <Money label="Tax" value={r.tax_amount} currency={r.currency} />
          <div className="border-t border-slate-100 pt-2">
            <Money label="Total Revenue" value={r.total_revenue} currency={r.currency} bold />
            <Money label="Paid" value={r.amount_paid} currency={r.currency} />
            <Money label="Outstanding" value={r.outstanding_amount} currency={r.currency} bold />
          </div>
          {(r.invoice_number || r.extra_invoice_number) && (
            <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">
              {r.invoice_number && <p>Invoice: {r.invoice_number}</p>}
              {r.extra_invoice_number && <p>Extra invoice: {r.extra_invoice_number}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <p className="text-sm font-semibold text-navy-900">Operational Details</p>
          <p className="text-xs text-slate-400">
            Room assignment and check-in/out status are owned by Pixel PMS in production. Manual changes here are logged as overrides.
          </p>
        </div>
        <form action={updateWithId} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="booking_status">
              Booking status
            </label>
            <select id="booking_status" name="booking_status" defaultValue={r.booking_status} disabled={!canEdit} className="input">
              {["inquiry", "quotation", "tentative", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"].map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="room_id">
              Assigned room
            </label>
            <select id="room_id" name="room_id" defaultValue={r.room_id ?? ""} disabled={!canEdit} className="input">
              <option value="">Unassigned</option>
              {(rooms ?? []).map((room) => (
                <option key={room.id} value={room.id}>
                  {room.room_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="amount_paid">
              Amount paid
            </label>
            <input id="amount_paid" name="amount_paid" type="number" step="0.01" defaultValue={r.amount_paid} disabled={!canEdit} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="internal_notes">
              Internal notes
            </label>
            <textarea id="internal_notes" name="internal_notes" defaultValue={r.internal_notes ?? ""} disabled={!canEdit} rows={2} className="input" />
          </div>
          {canEdit && (
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary">
                Save
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function Info({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      {href ? (
        <Link href={href} className="text-sm font-medium text-brand-600 hover:underline">
          {value}
        </Link>
      ) : (
        <p className="text-sm font-medium text-navy-900">{value}</p>
      )}
    </div>
  );
}

function Money({ label, value, currency, bold }: { label: string; value: number; currency: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? "font-semibold text-navy-900" : "text-navy-800"}>{formatCurrency(value, currency)}</span>
    </div>
  );
}
