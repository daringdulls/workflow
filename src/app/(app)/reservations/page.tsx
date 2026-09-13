import { CalendarRange } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { getActivePropertyId } from "@/lib/active-property";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { BOOKING_STATUS_TONE, PAYMENT_STATUS_TONE } from "@/lib/status-styles";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

export default async function ReservationsPage({ searchParams }: { searchParams: { status?: string; property?: string } }) {
  const user = await getCurrentUser();
  const supabase = createClient();
  const activePropertyId = user ? getActivePropertyId(user.properties) : null;
  const propertyFilter = searchParams.property ?? activePropertyId ?? undefined;

  let query = supabase
    .from("reservations")
    .select("*, guests(first_name, last_name), properties(name)")
    .order("arrival_date", { ascending: false })
    .limit(50);
  if (user?.profile?.organization_id) query = query.eq("organization_id", user.profile.organization_id);
  if (propertyFilter) query = query.eq("property_id", propertyFilter);
  if (searchParams.status) query = query.eq("booking_status", searchParams.status);

  const { data: reservations } = await query;

  const columns: Column<any>[] = [
    { header: "Booking #", cell: (r) => <span className="font-medium text-navy-900">{r.booking_number}</span> },
    { header: "Guest", cell: (r) => (r.guests ? `${r.guests.first_name} ${r.guests.last_name}` : "—") },
    { header: "Property", cell: (r) => r.properties?.name ?? "—" },
    { header: "Arrival", cell: (r) => formatDate(r.arrival_date) },
    { header: "Departure", cell: (r) => formatDate(r.departure_date) },
    { header: "Source", cell: (r) => titleCase(r.booking_source) },
    { header: "Payment", cell: (r) => <StatusBadge status={r.payment_status} tone={PAYMENT_STATUS_TONE[r.payment_status]} /> },
    { header: "Status", cell: (r) => <StatusBadge status={r.booking_status} tone={BOOKING_STATUS_TONE[r.booking_status]} /> },
    { header: "Revenue", cell: (r) => formatCurrency(r.total_revenue, r.currency) },
  ];

  return (
    <div>
      <PageHeader title="Reservations" description="Synced from Pixel Booking Manager — the primary booking data source." />

      <div className="mb-4 flex flex-wrap gap-2">
        {["", "inquiry", "quotation", "tentative", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"].map((s) => (
          <a
            key={s || "all"}
            href={`/reservations${s ? `?status=${s}` : ""}`}
            className={`badge ${searchParams.status === s || (!searchParams.status && !s) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {s ? titleCase(s) : "All"}
          </a>
        ))}
      </div>

      {!reservations || reservations.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No reservations yet"
          description="Connect Pixel Booking Manager to start receiving booking data."
        />
      ) : (
        <DataTable columns={columns} rows={reservations} rowHref={(r) => `/reservations/${r.id}`} />
      )}
    </div>
  );
}
