import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { timeAgo, titleCase } from "@/lib/format";
import type { Tone } from "@/lib/status-styles";

const STATUS_TONE: Record<string, Tone> = {
  pending: "amber",
  approved: "blue",
  sent: "emerald",
  rejected: "red",
};

export default async function AiInquiriesPage({ searchParams }: { searchParams: { status?: string } }) {
  const user = await getCurrentUser();
  const supabase = createClient();

  let query = supabase
    .from("ai_drafts")
    .select("*, leads(guest_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (user?.profile?.organization_id) query = query.eq("organization_id", user.profile.organization_id);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  const { data: drafts } = await query;

  const columns: Column<any>[] = [
    { header: "Guest", cell: (d) => <span className="font-medium text-navy-900">{d.leads?.guest_name ?? d.contact_address}</span> },
    { header: "Channel", cell: (d) => titleCase(d.channel) },
    { header: "Draft reply", cell: (d) => <span className="line-clamp-1 max-w-xs text-slate-500">{d.draft_reply}</span> },
    { header: "Confidence", cell: (d) => titleCase(d.confidence ?? "—") },
    { header: "Status", cell: (d) => <StatusBadge status={d.status} tone={STATUS_TONE[d.status] ?? "slate"} /> },
    { header: "Received", cell: (d) => timeAgo(d.created_at) },
  ];

  return (
    <div>
      <PageHeader title="AI Inquiries" description="Inbound WhatsApp and email inquiries, drafted by Pixel AI. Nothing is sent until you approve it." />

      <div className="mb-4 flex flex-wrap gap-2">
        {["", "pending", "approved", "sent", "rejected"].map((s) => (
          <a
            key={s || "all"}
            href={`/ai-inquiries${s ? `?status=${s}` : ""}`}
            className={`badge ${searchParams.status === s || (!searchParams.status && !s) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {s ? titleCase(s) : "All"}
          </a>
        ))}
      </div>

      {!drafts || drafts.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No AI-drafted replies yet"
          description="Connect WhatsApp or email inbound webhooks and Pixel AI will draft replies here for you to review and send."
        />
      ) : (
        <DataTable columns={columns} rows={drafts} rowHref={(d) => `/ai-inquiries/${d.id}`} />
      )}
    </div>
  );
}
