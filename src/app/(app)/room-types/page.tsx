import { Tags } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function RoomTypesPage({ searchParams }: { searchParams: { property?: string } }) {
  const user = await getCurrentUser();
  const supabase = createClient();
  const propertyIds = user?.properties.map((p) => p.id) ?? [];

  let query = supabase.from("room_types").select("*, properties(name)").order("name");
  if (searchParams.property) query = query.eq("property_id", searchParams.property);
  else if (propertyIds.length) query = query.in("property_id", propertyIds);
  else query = query.eq("property_id", "00000000-0000-0000-0000-000000000000");

  const { data: roomTypes } = await query;

  const columns: Column<any>[] = [
    { header: "Room Type", cell: (rt) => <span className="font-medium text-navy-900">{rt.name}</span> },
    { header: "Code", cell: (rt) => rt.code },
    { header: "Property", cell: (rt) => rt.properties?.name ?? "—" },
    { header: "Max Guests", cell: (rt) => rt.max_guests },
    { header: "Base Occupancy", cell: (rt) => rt.base_occupancy },
    { header: "Status", cell: (rt) => <StatusBadge status={rt.status} tone={rt.status === "active" ? "emerald" : "slate"} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Room Types"
        description="Categories of rooms shared by rates, availability and reservations."
        actions={
          <a href="/room-types/new" className="btn-primary">
            Add Room Type
          </a>
        }
      />
      {!roomTypes || roomTypes.length === 0 ? (
        <EmptyState icon={Tags} title="No room types yet" description="Add a room type before creating rooms, rates or availability." actionLabel="Add Room Type" actionHref="/room-types/new" />
      ) : (
        <DataTable columns={columns} rows={roomTypes} rowHref={(rt) => `/room-types/${rt.id}`} />
      )}
    </div>
  );
}
