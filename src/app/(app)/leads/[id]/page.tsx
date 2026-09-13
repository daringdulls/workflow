import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { LEAD_STATUS_TONE } from "@/lib/status-styles";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import { updateLead } from "../actions";
import { addCommunication } from "../../guests/actions";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  const { data: lead } = await supabase.from("leads").select("*, properties(name)").eq("id", params.id).maybeSingle();
  if (!lead) notFound();

  const orgId = user?.profile?.organization_id;
  const [{ data: staff }, { data: messages }, { data: quotations }] = await Promise.all([
    orgId ? supabase.from("profiles").select("*").eq("organization_id", orgId).order("first_name") : Promise.resolve({ data: [] }),
    supabase.from("communications").select("*").eq("lead_id", lead.id).order("occurred_at", { ascending: false }),
    supabase.from("quotations").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }),
  ]);

  const updateWithId = updateLead.bind(null, lead.id);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={lead.guest_name}
        description={`${lead.lead_number} · ${titleCase(lead.source)}`}
        actions={<StatusBadge status={lead.status} tone={LEAD_STATUS_TONE[lead.status]} />}
      />

      <div className="flex flex-wrap gap-2">
        <Link href={`/quotations/new?lead=${lead.id}`} className="btn-primary">
          Create Quotation
        </Link>
      </div>

      <form action={updateWithId} className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <input type="hidden" name="guest_name" value={lead.guest_name} />
        <input type="hidden" name="source" value={lead.source} />
        <input type="hidden" name="property_id" value={lead.property_id ?? ""} />
        <input type="hidden" name="contact_email" value={lead.contact_email ?? ""} />
        <input type="hidden" name="contact_phone" value={lead.contact_phone ?? ""} />
        <input type="hidden" name="travel_start_date" value={lead.travel_start_date ?? ""} />
        <input type="hidden" name="travel_end_date" value={lead.travel_end_date ?? ""} />
        <input type="hidden" name="adults" value={lead.adults ?? 1} />
        <input type="hidden" name="children" value={lead.children ?? 0} />
        <input type="hidden" name="requirements" value={lead.requirements ?? ""} />
        <input type="hidden" name="estimated_value" value={lead.estimated_value ?? ""} />
        <input type="hidden" name="notes" value={lead.notes ?? ""} />

        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={lead.status} className="input">
            {["new", "contacted", "qualified", "quotation", "follow_up", "won", "lost"].map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lost_reason">
            Lost reason (if lost)
          </label>
          <select id="lost_reason" name="lost_reason" defaultValue={lead.lost_reason ?? ""} className="input">
            <option value="">—</option>
            {["price", "no_availability", "no_response", "booked_competitor", "dates_changed", "flight_issue", "visa_issue", "other"].map((r) => (
              <option key={r} value={r}>
                {titleCase(r)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="assigned_to">
            Assigned staff
          </label>
          <select id="assigned_to" name="assigned_to" defaultValue={lead.assigned_to ?? ""} className="input">
            <option value="">Unassigned</option>
            {(staff ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="follow_up_date">
            Follow-up date
          </label>
          <input id="follow_up_date" name="follow_up_date" type="date" defaultValue={lead.follow_up_date ?? ""} className="input" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary">
            Save
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Info label="Travel dates" value={lead.travel_start_date ? `${formatDate(lead.travel_start_date)} → ${formatDate(lead.travel_end_date)}` : "—"} />
        <Info label="Property" value={lead.properties?.name ?? "Any"} />
        <Info label="Estimated value" value={lead.estimated_value ? `$${lead.estimated_value}` : "—"} />
      </div>

      {quotations && quotations.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-navy-900">Quotations</p>
          <div className="card divide-y divide-slate-100">
            {quotations.map((q) => (
              <Link key={q.id} href={`/quotations/${q.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-alt/60">
                <span>{q.quotation_number}</span>
                <span className="text-slate-400">{titleCase(q.status)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-navy-900">Communications</p>
        <form action={addCommunication} className="card mb-3 space-y-3 p-4">
          <input type="hidden" name="lead_id" value={lead.id} />
          <div className="grid grid-cols-2 gap-3">
            <select name="channel" className="input" defaultValue="internal_note">
              <option value="internal_note">Internal note</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
            <select name="direction" className="input" defaultValue="internal">
              <option value="internal">Internal</option>
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
          </div>
          <textarea name="message" required rows={2} placeholder="Log a message or note…" className="input" />
          <button type="submit" className="btn-secondary">
            Log Communication
          </button>
        </form>
        {messages && messages.length > 0 && (
          <div className="card divide-y divide-slate-100">
            {messages.map((m) => (
              <div key={m.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{titleCase(m.channel)}</span>
                  <span className="text-xs text-slate-400">{formatDateTime(m.occurred_at)}</span>
                </div>
                <p className="mt-0.5 text-sm text-slate-600">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-navy-900">{value}</p>
    </div>
  );
}
