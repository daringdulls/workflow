import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, TriangleAlert, Wrench, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate, formatDateTime, titleCase } from "@/lib/format";
import { AI_DRAFT_STATUS_TONE } from "@/lib/status-styles";
import { approveAndSend, rejectDraft } from "../actions";

export default async function AiInquiryDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { sent?: string; reason?: string };
}) {
  const supabase = createClient();
  const { data: draft } = await supabase.from("ai_drafts").select("*, leads(guest_name, id)").eq("id", params.id).maybeSingle();
  if (!draft) notFound();

  const quote = draft.suggested_quotation as any;
  const toolLog = (draft.tool_log as any[]) ?? [];
  const approveWithId = approveAndSend.bind(null, draft.id);
  const rejectWithId = rejectDraft.bind(null, draft.id);
  const canAct = draft.status === "pending" || draft.status === "human_required";

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={draft.leads?.guest_name ?? draft.contact_address ?? "AI Inquiry"}
        description={`${titleCase(draft.channel)} · ${draft.contact_address} · received ${formatDateTime(draft.created_at)}${draft.intent ? ` · ${titleCase(draft.intent)}` : ""}`}
        actions={<StatusBadge status={draft.status} tone={AI_DRAFT_STATUS_TONE[draft.status] ?? "slate"} />}
      />

      {searchParams.sent === "true" && (
        <div className="flex items-center gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-600">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Sent to the guest.
        </div>
      )}
      {searchParams.sent === "false" && (
        <div className="flex items-start gap-2 rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning-600">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Marked approved, but not auto-sent: {searchParams.reason ?? "no send channel configured"}. Copy the reply below and send it manually.</span>
        </div>
      )}

      <div className="card p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Guest message</p>
        <p className="whitespace-pre-wrap text-sm text-navy-800">{draft.inbound_message}</p>
      </div>

      {draft.ai_action_summary && (
        <p className="text-xs text-slate-400">{draft.ai_action_summary}</p>
      )}

      {draft.escalated && (
        <div className="flex items-start gap-2 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-600">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">Pixel AI escalated this — human required.</span>{" "}
            {draft.escalation_reason ?? "No confident, grounded answer was available."} Take over the conversation below: edit the reply
            and send it, or add the missing information to the Knowledge Base / Rate Engine first.
          </span>
        </div>
      )}

      {draft.needs_more_info && draft.needs_more_info.length > 0 && (
        <div className="rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning-600">
          <p className="mb-1 font-medium">Pixel AI flagged missing information:</p>
          <ul className="list-inside list-disc">
            {draft.needs_more_info.map((info: string, i: number) => (
              <li key={i}>{info}</li>
            ))}
          </ul>
        </div>
      )}

      <form action={approveWithId} className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="draft_reply">
            Draft reply {draft.confidence && <span className="text-slate-400">· confidence: {draft.confidence}</span>}
          </label>
          <textarea id="draft_reply" name="draft_reply" defaultValue={draft.draft_reply} rows={6} disabled={!canAct} className="input" />
        </div>

        {quote && (
          <div className="rounded-xl border border-slate-100 bg-surface-alt/40 p-4">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-navy-900">
              <input type="checkbox" name="create_quotation" defaultChecked disabled={!canAct} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
              Create a draft quotation from this suggestion
            </label>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Info label="Property" value={quote.property_code} />
              <Info label="Room type" value={quote.room_type_code ?? "—"} />
              <Info label="Meal plan" value={quote.meal_plan ?? "—"} />
              <Info label="Dates" value={`${formatDate(quote.arrival_date)} → ${formatDate(quote.departure_date)}`} />
              <Info label="Accommodation" value={formatCurrency(quote.accommodation_amount, quote.currency)} />
              {quote.notes && <Info label="Notes" value={quote.notes} />}
            </div>
          </div>
        )}

        {canAct && (
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary">
              Approve &amp; Send
            </button>
          </div>
        )}
      </form>

      {canAct && (
        <form action={rejectWithId}>
          <button type="submit" className="btn-secondary text-danger-600">
            Reject — don&apos;t send
          </button>
        </form>
      )}

      {draft.lead_id && (
        <Link href={`/leads/${draft.lead_id}`} className="inline-block text-sm font-medium text-brand-600 hover:underline">
          View linked lead →
        </Link>
      )}

      {toolLog.length > 0 && (
        <details className="card p-5">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-navy-900">
            <Wrench className="h-4 w-4" /> What Pixel AI checked ({toolLog.length} lookups)
          </summary>
          <div className="mt-3 space-y-2">
            {toolLog.map((entry, i) => (
              <div key={i} className="rounded-lg bg-slate-50 p-3 text-xs">
                <p className="font-mono font-semibold text-navy-800">{entry.tool}</p>
                <p className="mt-1 text-slate-500">{JSON.stringify(entry.input)}</p>
                <p className="mt-1 text-slate-400">{entry.result_summary}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-navy-900">{value}</p>
    </div>
  );
}
