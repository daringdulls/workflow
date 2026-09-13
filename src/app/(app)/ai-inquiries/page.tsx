import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { AI_DRAFT_STATUS_TONE } from "@/lib/status-styles";
import { formatCurrency, timeAgo, titleCase } from "@/lib/format";

const TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Waiting Approval" },
  { key: "human_required", label: "Human Required" },
  { key: "sent", label: "Waiting Guest" },
  { key: "converted", label: "Converted" },
  { key: "rejected", label: "Rejected" },
];

export default async function AiInquiriesPage({ searchParams }: { searchParams: { status?: string } }) {
  const user = await getCurrentUser();
  const supabase = createClient();
  const activeTab = searchParams.status ?? "";

  let query = supabase.from("ai_drafts").select("*, leads(guest_name), quotations(status, total_amount, currency)").order("created_at", { ascending: false }).limit(100);
  if (user?.profile?.organization_id) query = query.eq("organization_id", user.profile.organization_id);

  if (activeTab === "converted") {
    query = supabase
      .from("ai_drafts")
      .select("*, leads(guest_name), quotations!inner(status, total_amount, currency)")
      .eq("quotations.status", "converted")
      .order("created_at", { ascending: false })
      .limit(100);
    if (user?.profile?.organization_id) query = query.eq("organization_id", user.profile.organization_id);
  } else if (activeTab) {
    query = query.eq("status", activeTab);
  }

  const { data: drafts } = await query;

  const columns: Column<any>[] = [
    { header: "Guest", cell: (d) => <span className="font-medium text-navy-900">{d.leads?.guest_name ?? d.contact_address}</span> },
    { header: "Channel", cell: (d) => titleCase(d.channel) },
    { header: "Intent", cell: (d) => (d.intent ? titleCase(d.intent) : "—") },
    { header: "Confidence", cell: (d) => titleCase(d.confidence ?? "—") },
    { header: "Quote", cell: (d) => (d.quotations ? formatCurrency(d.quotations.total_amount, d.quotations.currency) : "—") },
    { header: "Status", cell: (d) => <StatusBadge status={d.status} tone={AI_DRAFT_STATUS_TONE[d.status] ?? "slate"} /> },
    { header: "Received", cell: (d) => timeAgo(d.created_at) },
  ];

  return (
    <div>
      <PageHeader title="AI Inbox" description="Every guest inquiry Pixel AI has touched — from first read to sent reply. Nothing goes to a guest without a confidence-and-approval check." />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <a
            key={t.key || "all"}
            href={`/ai-inquiries${t.key ? `?status=${t.key}` : ""}`}
            className={`badge ${activeTab === t.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {t.label}
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
