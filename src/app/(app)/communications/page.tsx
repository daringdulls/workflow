import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, titleCase } from "@/lib/format";

export default async function CommunicationsPage() {
  const user = await getCurrentUser();
  const supabase = createClient();

  const { data: messages } = user?.profile?.organization_id
    ? await supabase
        .from("communications")
        .select("*, guests(first_name, last_name), leads(guest_name)")
        .eq("organization_id", user.profile.organization_id)
        .order("occurred_at", { ascending: false })
        .limit(100)
    : { data: [] };

  return (
    <div>
      <PageHeader title="Communications" description="Every WhatsApp, email, phone and internal note across guests and leads." />
      {!messages || messages.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No communications logged" description="Log a note from a guest or lead profile to start the timeline." />
      ) : (
        <div className="card divide-y divide-slate-100">
          {messages.map((m: any) => (
            <div key={m.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-navy-900">
                  {m.guests ? `${m.guests.first_name} ${m.guests.last_name}` : m.leads ? m.leads.guest_name : "Unlinked"}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{titleCase(m.channel)}</p>
                <p className="mt-1 text-sm text-slate-600">{m.message}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">{formatDateTime(m.occurred_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
