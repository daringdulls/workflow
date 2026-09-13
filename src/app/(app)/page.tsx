import { Users, CalendarRange, PieChart, DollarSign, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { getActivePropertyId } from "@/lib/active-property";
import { resolveDateRange, type RangeKey } from "@/lib/date-range";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { AppStatusGrid } from "@/components/dashboard/app-status-grid";
import { DataFlow } from "@/components/dashboard/data-flow";
import { RecentActivity, type ActivityRow } from "@/components/dashboard/recent-activity";
import { UpcomingArrivals, type ArrivalRow } from "@/components/dashboard/upcoming-arrivals";
import { LeadsTable, type LeadRow } from "@/components/dashboard/leads-table";
import { SystemHealth, type HealthItem } from "@/components/dashboard/system-health";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/format";
import type { AppConnection, SyncLog } from "@/lib/database.types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: RangeKey; from?: string; to?: string };
}) {
  const user = await getCurrentUser();

  if (!user?.profile?.organization_id) {
    return (
      <div>
        <PageHeader title="Welcome to Pixel Core" description="Let's get your organization set up." />
        <EmptyState
          icon={Building2}
          title="No organization assigned yet"
          description="Ask a Pixel Core administrator to assign you to an organization, or create one to get started."
          actionLabel="Go to Organizations"
          actionHref="/organizations"
        />
      </div>
    );
  }

  const supabase = createClient();
  const orgId = user.profile.organization_id;
  const activePropertyId = getActivePropertyId(user.properties);
  const range = resolveDateRange(searchParams.range, searchParams.from, searchParams.to);

  let reservationsQuery = supabase
    .from("reservations")
    .select("id, guest_id, total_revenue, booking_status, booking_date")
    .eq("organization_id", orgId)
    .gte("booking_date", range.from)
    .lte("booking_date", range.to);
  if (activePropertyId) reservationsQuery = reservationsQuery.eq("property_id", activePropertyId);

  const propertyIds = activePropertyId ? [activePropertyId] : user.properties.map((p) => p.id);
  const availabilityQuery = supabase
    .from("availability_daily")
    .select("total_inventory, available_rooms, property_id")
    .gte("date", range.from)
    .lte("date", range.to)
    .in("property_id", propertyIds.length ? propertyIds : ["00000000-0000-0000-0000-000000000000"]);

  const [
    { data: rangeReservations },
    { data: availabilityRows },
    { data: appConnections },
    { data: syncLogs },
    { data: auditRows },
    { data: arrivalRows },
    { data: leadRows },
    { count: failedEventCount },
  ] = await Promise.all([
    reservationsQuery,
    availabilityQuery,
    supabase.from("app_connections").select("*").order("is_primary_source", { ascending: false }),
    supabase.from("sync_logs").select("*").order("started_at", { ascending: false }).limit(50),
    supabase
      .from("audit_logs")
      .select("id, created_at, application, entity_type, entity_id, action, profiles(first_name, last_name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("reservations")
      .select(
        "id, booking_number, arrival_date, adults, children, meal_plan, booking_status, guests(first_name, last_name), properties(name), room_types(name)"
      )
      .eq("organization_id", orgId)
      .gte("arrival_date", new Date().toISOString().slice(0, 10))
      .not("booking_status", "in", "(cancelled,no_show,checked_out)")
      .order("arrival_date", { ascending: true })
      .limit(8),
    supabase
      .from("leads")
      .select("id, guest_name, source, travel_start_date, travel_end_date, status, follow_up_date, properties(name), profiles(first_name, last_name)")
      .eq("organization_id", orgId)
      .not("status", "in", "(won,lost)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("events").select("status", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  const totalGuests = new Set((rangeReservations ?? []).map((r) => r.guest_id)).size;
  const totalBookings = (rangeReservations ?? []).length;
  const revenue = (rangeReservations ?? [])
    .filter((r) => !["cancelled", "no_show"].includes(r.booking_status))
    .reduce((sum, r) => sum + (r.total_revenue ?? 0), 0);
  const totalInv = (availabilityRows ?? []).reduce((s, r) => s + r.total_inventory, 0);
  const totalAvail = (availabilityRows ?? []).reduce((s, r) => s + r.available_rooms, 0);
  const occupancy = totalInv > 0 ? Math.round(((totalInv - totalAvail) / totalInv) * 100) : null;

  const latestLogs: Record<string, SyncLog | undefined> = {};
  for (const log of syncLogs ?? []) {
    if (!latestLogs[log.app_key]) latestLogs[log.app_key] = log as SyncLog;
  }
  const lastSuccessfulSync = (appConnections ?? []).reduce<string | null>((latest, app) => {
    if (!app.last_sync_at) return latest;
    if (!latest || app.last_sync_at > latest) return app.last_sync_at;
    return latest;
  }, null);

  const hasErrorApp = (appConnections ?? []).some((a) => a.status === "error");
  const failedEvents = failedEventCount ?? 0;

  const healthItems: HealthItem[] = [
    { label: "Database", status: "healthy" },
    { label: "API", status: "healthy" },
    { label: "Event queue", status: failedEvents > 0 ? "warning" : "healthy", detail: failedEvents > 0 ? `${failedEvents} failed` : "Healthy" },
    { label: "Sync workers", status: hasErrorApp ? "error" : "healthy", detail: hasErrorApp ? "Error" : "Healthy" },
    { label: "Storage", status: "healthy" },
    { label: "Authentication", status: "healthy" },
  ];

  const activityRows: ActivityRow[] = (auditRows ?? []).map((r: any) => ({
    id: r.id,
    created_at: r.created_at,
    application: r.application,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    action: r.action,
    user_name: r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}`.trim() : "System",
  }));

  const arrivals: ArrivalRow[] = (arrivalRows ?? []).map((r: any) => ({
    id: r.id,
    guest_name: r.guests ? `${r.guests.first_name} ${r.guests.last_name}` : "—",
    booking_number: r.booking_number ?? "",
    property_name: r.properties?.name ?? "—",
    arrival_date: r.arrival_date,
    guests: (r.adults ?? 0) + (r.children ?? 0),
    room_type: r.room_types?.name ?? "—",
    meal_plan: r.meal_plan ?? "—",
    booking_status: r.booking_status,
  }));

  const leads: LeadRow[] = (leadRows ?? []).map((r: any) => ({
    id: r.id,
    guest_name: r.guest_name,
    source: r.source,
    travel_dates: r.travel_start_date ? `${r.travel_start_date} → ${r.travel_end_date ?? "?"}` : "—",
    property_name: r.properties?.name ?? "—",
    assigned_staff: r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}`.trim() : "Unassigned",
    status: r.status,
    follow_up_date: r.follow_up_date,
  }));

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description={`Ecosystem overview · ${range.label}`} actions={<DateRangeFilter active={searchParams.range ?? "today"} />} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Guests" value={totalGuests.toLocaleString()} icon={Users} />
        <KpiCard label="Total Bookings" value={totalBookings.toLocaleString()} icon={CalendarRange} />
        <KpiCard label="Occupancy" value={occupancy !== null ? `${occupancy}%` : "—"} icon={PieChart} />
        <KpiCard label="Revenue" value={formatCurrency(revenue)} icon={DollarSign} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-navy-900">Pixel Application Status</h2>
        <AppStatusGrid apps={(appConnections ?? []) as AppConnection[]} latestLogs={latestLogs} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-navy-900">Ecosystem Data Flow</h2>
        <DataFlow apps={(appConnections ?? []) as AppConnection[]} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-navy-900">Upcoming Arrivals</h2>
            <UpcomingArrivals rows={arrivals} />
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-navy-900">Inquiries &amp; Leads</h2>
            <LeadsTable rows={leads} />
          </section>
        </div>
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-navy-900">Recent Activity</h2>
            <RecentActivity rows={activityRows} />
          </section>
          <SystemHealth items={healthItems} lastBackup={null} lastSync={lastSuccessfulSync} />
        </div>
      </div>
    </div>
  );
}
