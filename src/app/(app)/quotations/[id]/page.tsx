import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { QUOTATION_STATUS_TONE } from "@/lib/status-styles";
import { formatCurrency } from "@/lib/format";
import { updateQuotation, duplicateQuotation, convertQuotationToBooking } from "../actions";

export default async function QuotationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: q } = await supabase.from("quotations").select("*, properties(name), guests(first_name, last_name)").eq("id", params.id).maybeSingle();
  if (!q) notFound();

  const updateWithId = updateQuotation.bind(null, q.id);
  const duplicateWithId = duplicateQuotation.bind(null, q.id);
  const convertWithId = convertQuotationToBooking.bind(null, q.id);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={q.quotation_number}
        description={q.guests ? `${q.guests.first_name} ${q.guests.last_name} · ${q.properties?.name ?? ""}` : q.properties?.name ?? ""}
        actions={<StatusBadge status={q.status} tone={QUOTATION_STATUS_TONE[q.status]} />}
      />

      <div className="flex flex-wrap gap-2">
        <Link href={`/quotations/${q.id}/print`} target="_blank" className="btn-secondary">
          Generate PDF
        </Link>
        <form action={duplicateWithId}>
          <button type="submit" className="btn-secondary">
            Duplicate
          </button>
        </form>
        {q.status !== "converted" && (
          <form action={convertWithId}>
            <button type="submit" className="btn-primary">
              Convert to Booking
            </button>
          </form>
        )}
      </div>

      <form action={updateWithId} className="card space-y-4 p-6">
        <input type="hidden" name="property_id" value={q.property_id} />
        <input type="hidden" name="guest_id" value={q.guest_id ?? ""} />
        <input type="hidden" name="lead_id" value={q.lead_id ?? ""} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="arrival_date">
              Arrival
            </label>
            <input id="arrival_date" name="arrival_date" type="date" defaultValue={q.arrival_date ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="departure_date">
              Departure
            </label>
            <input id="departure_date" name="departure_date" type="date" defaultValue={q.departure_date ?? ""} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="meal_plan">
            Meal plan
          </label>
          <input id="meal_plan" name="meal_plan" defaultValue={q.meal_plan ?? ""} className="input" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              ["accommodation_amount", "Accommodation"],
              ["dive_amount", "Dive"],
              ["transfer_amount", "Transfers"],
              ["activities_amount", "Activities"],
              ["domestic_flight_amount", "Domestic flights"],
              ["extras_amount", "Extras"],
              ["discount_amount", "Discount"],
              ["tax_amount", "Tax"],
            ] as const
          ).map(([name, label]) => (
            <div key={name}>
              <label className="label" htmlFor={name}>
                {label}
              </label>
              <input id={name} name={name} type="number" step="0.01" defaultValue={(q as any)[name]} className="input" />
            </div>
          ))}
          <div>
            <label className="label" htmlFor="currency">
              Currency
            </label>
            <input id="currency" name="currency" defaultValue={q.currency} className="input" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold text-navy-900">
          <span>Total</span>
          <span>{formatCurrency(q.total_amount, q.currency)}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="expiry_date">
              Expiry date
            </label>
            <input id="expiry_date" name="expiry_date" type="date" defaultValue={q.expiry_date ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" defaultValue={q.status} className="input">
              {["draft", "sent", "viewed", "accepted", "rejected", "expired", "converted"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="terms">
            Terms
          </label>
          <textarea id="terms" name="terms" defaultValue={q.terms ?? ""} rows={2} className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Save changes
        </button>
      </form>
    </div>
  );
}
