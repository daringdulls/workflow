import { DollarSign, Waves, Plane, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { TabsNav } from "@/components/ui/tabs-nav";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

const TABS = [
  { key: "rooms", label: "Room Rates" },
  { key: "diving", label: "Dive Rates" },
  { key: "transfers", label: "Transfer Rates" },
  { key: "offers", label: "Offers" },
];

export default async function RatesPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = searchParams.tab ?? "rooms";
  const user = await getCurrentUser();
  const supabase = createClient();
  const orgId = user?.profile?.organization_id;

  return (
    <div>
      <PageHeader
        title="Rate Engine"
        description="One shared rate engine — room rates, dive packages, transfers and offers — used by quotations, reservations and every future B2B/B2C channel."
        actions={<AddButton tab={tab} />}
      />
      <TabsNav base="/rates" active={tab} tabs={TABS} />

      {tab === "rooms" && <RoomRatesTab orgId={orgId} supabase={supabase} />}
      {tab === "diving" && <DiveRatesTab orgId={orgId} supabase={supabase} />}
      {tab === "transfers" && <TransferRatesTab orgId={orgId} supabase={supabase} />}
      {tab === "offers" && <OffersTab orgId={orgId} supabase={supabase} />}
    </div>
  );
}

function AddButton({ tab }: { tab: string }) {
  const hrefs: Record<string, string> = {
    rooms: "/rates/new",
    diving: "/rates/dive-rates/new",
    transfers: "/rates/transfer-rates/new",
    offers: "/rates/offers/new",
  };
  const labels: Record<string, string> = {
    rooms: "Add Room Rate",
    diving: "Add Dive Rate",
    transfers: "Add Transfer Rate",
    offers: "Add Offer",
  };
  return (
    <a href={hrefs[tab] ?? "/rates/new"} className="btn-primary">
      {labels[tab] ?? "Add Rate"}
    </a>
  );
}

async function RoomRatesTab({ orgId, supabase }: { orgId?: string | null; supabase: any }) {
  const { data: rates } = orgId
    ? await supabase
        .from("rate_plans")
        .select("*, properties(name), room_types(name), agents(company_name)")
        .eq("organization_id", orgId)
        .order("start_date", { ascending: false })
    : { data: [] };

  const columns: Column<any>[] = [
    { header: "Rate", cell: (r) => <span className="font-medium text-navy-900">{r.name}</span> },
    { header: "Type", cell: (r) => titleCase(r.rate_type) },
    { header: "Property", cell: (r) => r.properties?.name ?? "—" },
    { header: "Room Type", cell: (r) => r.room_types?.name ?? "All" },
    { header: "Agent", cell: (r) => r.agents?.company_name ?? "—" },
    { header: "Amount", cell: (r) => formatCurrency(r.amount, r.currency) },
    { header: "Valid", cell: (r) => `${formatDate(r.start_date)} → ${formatDate(r.end_date)}` },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} tone={r.status === "active" ? "emerald" : r.status === "expired" ? "slate" : "amber"} /> },
  ];

  if (!rates || rates.length === 0) {
    return <EmptyState icon={DollarSign} title="No room rates yet" description="Add public, agent or promotional rates for your room types." actionLabel="Add Room Rate" actionHref="/rates/new" />;
  }
  return <DataTable columns={columns} rows={rates} rowHref={(r) => `/rates/${r.id}`} />;
}

async function DiveRatesTab({ orgId, supabase }: { orgId?: string | null; supabase: any }) {
  const { data: rates } = orgId
    ? await supabase.from("dive_rates").select("*, properties(name)").eq("organization_id", orgId).order("start_date", { ascending: false })
    : { data: [] };

  const columns: Column<any>[] = [
    { header: "Package", cell: (r) => <span className="font-medium text-navy-900">{r.package_name}</span> },
    { header: "Property", cell: (r) => r.properties?.name ?? "—" },
    { header: "Dives Included", cell: (r) => r.dives_included },
    { header: "Price / Person", cell: (r) => formatCurrency(r.price_per_person, r.currency) },
    { header: "Min Participants", cell: (r) => r.min_participants },
    { header: "Valid", cell: (r) => `${formatDate(r.start_date)} → ${formatDate(r.end_date)}` },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} tone={r.status === "active" ? "emerald" : r.status === "expired" ? "slate" : "amber"} /> },
  ];

  if (!rates || rates.length === 0) {
    return <EmptyState icon={Waves} title="No dive rates yet" description="Add dive packages so quotes and the AI agent can price diving accurately." actionLabel="Add Dive Rate" actionHref="/rates/dive-rates/new" />;
  }
  return <DataTable columns={columns} rows={rates} rowHref={(r) => `/rates/dive-rates/${r.id}`} />;
}

async function TransferRatesTab({ orgId, supabase }: { orgId?: string | null; supabase: any }) {
  const { data: rates } = orgId
    ? await supabase.from("transfer_rates").select("*, properties(name)").eq("organization_id", orgId).order("start_date", { ascending: false })
    : { data: [] };

  const columns: Column<any>[] = [
    { header: "Transfer Type", cell: (r) => <span className="font-medium text-navy-900">{titleCase(r.transfer_type)}</span> },
    { header: "Property", cell: (r) => r.properties?.name ?? "—" },
    { header: "Direction", cell: (r) => titleCase(r.direction) },
    { header: "Price / Person", cell: (r) => formatCurrency(r.price_per_person, r.currency) },
    { header: "Valid", cell: (r) => `${formatDate(r.start_date)} → ${formatDate(r.end_date)}` },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} tone={r.status === "active" ? "emerald" : r.status === "expired" ? "slate" : "amber"} /> },
  ];

  if (!rates || rates.length === 0) {
    return <EmptyState icon={Plane} title="No transfer rates yet" description="Add transfer pricing (domestic flights, speedboats, seaplanes) for accurate quotes." actionLabel="Add Transfer Rate" actionHref="/rates/transfer-rates/new" />;
  }
  return <DataTable columns={columns} rows={rates} rowHref={(r) => `/rates/transfer-rates/${r.id}`} />;
}

async function OffersTab({ orgId, supabase }: { orgId?: string | null; supabase: any }) {
  const { data: offers } = orgId
    ? await supabase.from("offers").select("*, properties(name)").eq("organization_id", orgId).order("start_date", { ascending: false })
    : { data: [] };

  const columns: Column<any>[] = [
    { header: "Offer", cell: (r) => <span className="font-medium text-navy-900">{r.name}</span> },
    { header: "Property", cell: (r) => r.properties?.name ?? "All properties" },
    { header: "Discount", cell: (r) => (r.discount_type === "percentage" ? `${r.discount_value}%` : formatCurrency(r.discount_value)) },
    { header: "Trigger", cell: (r) => (r.trigger_min_nights ? `Stay ${r.trigger_min_nights}+ nights` : "—") },
    { header: "Applies To", cell: (r) => r.applies_to.map(titleCase).join(", ") },
    { header: "Valid", cell: (r) => `${formatDate(r.start_date)} → ${formatDate(r.end_date)}` },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} tone={r.status === "active" ? "emerald" : r.status === "expired" ? "slate" : "amber"} /> },
  ];

  if (!offers || offers.length === 0) {
    return <EmptyState icon={Tag} title="No offers yet" description="Add stay-length or promo-code offers so the AI agent can apply them automatically." actionLabel="Add Offer" actionHref="/rates/offers/new" />;
  }
  return <DataTable columns={columns} rows={offers} rowHref={(r) => `/rates/offers/${r.id}`} />;
}
