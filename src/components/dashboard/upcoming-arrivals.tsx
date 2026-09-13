import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { BOOKING_STATUS_TONE } from "@/lib/status-styles";
import { formatDate } from "@/lib/format";
import type { BookingStatus } from "@/lib/database.types";

export interface ArrivalRow {
  id: string;
  guest_name: string;
  booking_number: string;
  property_name: string;
  arrival_date: string;
  guests: number;
  room_type: string;
  meal_plan: string;
  booking_status: BookingStatus;
}

export function UpcomingArrivals({ rows }: { rows: ArrivalRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No upcoming arrivals"
        description="Connect Pixel Booking Manager to start receiving booking data."
      />
    );
  }

  const columns: Column<ArrivalRow>[] = [
    { header: "Guest", cell: (r) => <span className="font-medium text-navy-900">{r.guest_name}</span> },
    { header: "Booking #", cell: (r) => r.booking_number },
    { header: "Property", cell: (r) => r.property_name },
    { header: "Arrival", cell: (r) => formatDate(r.arrival_date) },
    { header: "Guests", cell: (r) => r.guests },
    { header: "Room Type", cell: (r) => r.room_type },
    { header: "Meal Plan", cell: (r) => r.meal_plan },
    { header: "Status", cell: (r) => <StatusBadge status={r.booking_status} tone={BOOKING_STATUS_TONE[r.booking_status]} /> },
  ];

  return <DataTable columns={columns} rows={rows} rowHref={(r) => `/reservations/${r.id}`} />;
}
