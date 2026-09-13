import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { LEAD_STATUS_TONE } from "@/lib/status-styles";
import { formatDate, titleCase } from "@/lib/format";

export default async function LeadsPage({ searchParams }: { searchParams: { status?: string } }) {
  const user = await getCurrentUser();
  const supabase = createClient();

  let query = supabase.from("leads").select("*, properties(name), profiles(first_name, last_name)").order("created_at", { ascending: false });
  if (user?.profile?.organization_id) query = query.eq("organization_id", user.profile.organization_id);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  const { data: leads } = await query;

  const columns: Column<any>[] = [
    { header: "Guest / Lead", cell: (l) => <span className="font-medium text-navy-900">{l.guest_name}</span> },
    { header: "Source", cell: (l) => titleCase(l.source) },
    { header: "Property", cell: (l) => l.properties?.name ?? "—" },
    { header: "Assigned", cell: (l) => (l.profiles ? `${l.profiles.first_name} ${l.profiles.last_name}` : "Unassigned") },
    { header: "Status", cell: (l) => <StatusBadge status={l.status} tone={LEAD_STATUS_TONE[l.status]} /> },
    { header: "Follow-up", cell: (l) => formatDate(l.follow_up_date) },
  ];

  return (
    <div>
      <PageHeader
        title="Leads & Inquiries"
        description="Every inquiry across WhatsApp, social, website and walk-ins in one pipeline."
        actions={
          <a href="/leads/new" className="btn-primary">
            Add Lead
          </a>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["", "new", "contacted", "qualified", "quotation", "follow_up", "won", "lost"].map((s) => (
          <a
            key={s || "all"}
            href={`/leads${s ? `?status=${s}` : ""}`}
            className={`badge ${searchParams.status === s || (!searchParams.status && !s) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {s ? titleCase(s) : "All"}
          </a>
        ))}
      </div>

      {!leads || leads.length === 0 ? (
        <EmptyState icon={UserPlus} title="Your first inquiry will appear here" description="Log a lead manually, or connect Pixel Sales to receive them automatically." actionLabel="Add Lead" actionHref="/leads/new" />
      ) : (
        <DataTable columns={columns} rows={leads} rowHref={(l) => `/leads/${l.id}`} />
      )}
    </div>
  );
}
