import { BedDouble } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ROOM_STATUS_TONE } from "@/lib/status-styles";

export default async function RoomsPage({ searchParams }: { searchParams: { property?: string } }) {
  const user = await getCurrentUser();
  const supabase = createClient();
  const propertyIds = user?.properties.map((p) => p.id) ?? [];

  let query = supabase.from("rooms").select("*, properties(name), room_types(name)").order("room_number");
  if (searchParams.property) query = query.eq("property_id", searchParams.property);
  else if (propertyIds.length) query = query.in("property_id", propertyIds);
  else query = query.eq("property_id", "00000000-0000-0000-0000-000000000000");

  const { data: rooms } = await query;

  const columns: Column<any>[] = [
    { header: "Room #", cell: (r) => <span className="font-medium text-navy-900">{r.room_number}</span> },
    { header: "Property", cell: (r) => r.properties?.name ?? "—" },
    { header: "Room Type", cell: (r) => r.room_types?.name ?? "—" },
    { header: "Floor", cell: (r) => r.floor ?? "—" },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} tone={ROOM_STATUS_TONE[r.status]} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Rooms"
        description="Physical room inventory used for assignment and availability."
        actions={
          <a href="/rooms/new" className="btn-primary">
            Add Room
          </a>
        }
      />
      {!rooms || rooms.length === 0 ? (
        <EmptyState icon={BedDouble} title="No rooms yet" description="Add rooms once you've created room types for a property." actionLabel="Add Room" actionHref="/rooms/new" />
      ) : (
        <DataTable columns={columns} rows={rooms} rowHref={(r) => `/rooms/${r.id}`} />
      )}
    </div>
  );
}
