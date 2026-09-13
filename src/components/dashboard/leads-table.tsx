import { UserPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { LEAD_STATUS_TONE } from "@/lib/status-styles";
import { formatDate, titleCase } from "@/lib/format";
import type { LeadStatus } from "@/lib/database.types";

export interface LeadRow {
  id: string;
  guest_name: string;
  source: string;
  travel_dates: string;
  property_name: string;
  assigned_staff: string;
  status: LeadStatus;
  follow_up_date: string | null;
}

export function LeadsTable({ rows }: { rows: LeadRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState icon={UserPlus} title="No inquiries yet" description="Your first inquiry will appear here." />
    );
  }

  const columns: Column<LeadRow>[] = [
    { header: "Guest / Lead", cell: (r) => <span className="font-medium text-navy-900">{r.guest_name}</span> },
    { header: "Source", cell: (r) => titleCase(r.source) },
    { header: "Travel Dates", cell: (r) => r.travel_dates },
    { header: "Property", cell: (r) => r.property_name },
    { header: "Assigned Staff", cell: (r) => r.assigned_staff },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} tone={LEAD_STATUS_TONE[r.status]} /> },
    { header: "Follow-up", cell: (r) => formatDate(r.follow_up_date) },
  ];

  return <DataTable columns={columns} rows={rows} rowHref={(r) => `/leads/${r.id}`} />;
}
