import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import type { Guest } from "@/lib/database.types";

export default async function GuestsPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await getCurrentUser();
  const supabase = createClient();

  let query = supabase.from("guests").select("*").order("created_at", { ascending: false }).limit(50);
  if (user?.profile?.organization_id) query = query.eq("organization_id", user.profile.organization_id);
  if (searchParams.q) {
    const like = `%${searchParams.q}%`;
    query = query.or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like},guest_number.ilike.${like}`);
  }
  const { data: guests } = await query;

  const columns: Column<Guest>[] = [
    {
      header: "Guest",
      cell: (g) => (
        <div>
          <p className="font-medium text-navy-900">
            {g.title ? `${g.title} ` : ""}
            {g.first_name} {g.last_name}
            {g.vip_status && <span className="ml-1.5 badge bg-warning-50 text-warning-600">VIP</span>}
          </p>
          <p className="text-xs text-slate-400">{g.guest_number}</p>
        </div>
      ),
    },
    { header: "Email", cell: (g) => g.email ?? "—" },
    { header: "Phone", cell: (g) => g.phone ?? "—" },
    { header: "Nationality", cell: (g) => g.nationality ?? "—" },
  ];

  return (
    <div>
      <PageHeader
        title="Guests"
        description="The single guest master shared across every Pixel application."
        actions={
          <a href="/guests/new" className="btn-primary">
            Add Guest
          </a>
        }
      />

      <form className="mb-4" action="/guests" method="get">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search by name, email, phone or guest ID…"
          className="input max-w-md"
        />
      </form>

      {!guests || guests.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={searchParams.q ? "No guests match your search" : "No guests yet"}
          description={
            searchParams.q
              ? "Try a different name, email or phone number."
              : "Guests created here — or synced from Pixel Booking Manager — will appear in one shared profile."
          }
          actionLabel={searchParams.q ? undefined : "Add Guest"}
          actionHref={searchParams.q ? undefined : "/guests/new"}
        />
      ) : (
        <DataTable columns={columns} rows={guests} rowHref={(g) => `/guests/${g.id}`} />
      )}
    </div>
  );
}
