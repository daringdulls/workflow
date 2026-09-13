import { notFound } from "next/navigation";
import Link from "next/link";
import { TriangleAlert, CalendarRange, Waves, UtensilsCrossed, Wallet, Star, MessageSquare, FolderOpen, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { TabsNav } from "@/components/ui/tabs-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { BOOKING_STATUS_TONE } from "@/lib/status-styles";
import { formatCurrency, formatDate, formatDateTime, timeAgo, titleCase } from "@/lib/format";
import { updateGuest, addCommunication } from "../actions";
import { uploadFile } from "../../files/actions";
import type { Reservation } from "@/lib/database.types";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "bookings", label: "Bookings" },
  { key: "stays", label: "Stays" },
  { key: "diving", label: "Diving" },
  { key: "restaurant", label: "Restaurant" },
  { key: "payments", label: "Payments" },
  { key: "reviews", label: "Reviews" },
  { key: "communications", label: "Communications" },
  { key: "documents", label: "Documents" },
  { key: "activity", label: "Activity" },
];

export default async function GuestDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; duplicateOf?: string };
}) {
  const supabase = createClient();
  const currentUser = await getCurrentUser();
  const { data: guest } = await supabase.from("guests").select("*").eq("id", params.id).maybeSingle();
  if (!guest) notFound();

  const tab = searchParams.tab ?? "overview";
  const base = `/guests/${guest.id}`;
  const canEdit = Boolean(currentUser?.profile);

  const { data: duplicateGuest } = searchParams.duplicateOf
    ? await supabase.from("guests").select("id, first_name, last_name, guest_number").eq("id", searchParams.duplicateOf).maybeSingle()
    : { data: null };

  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, properties(name), room_types(name)")
    .eq("guest_id", guest.id)
    .order("arrival_date", { ascending: false });

  const totalRevenue = (reservations ?? []).reduce((s, r) => s + (r.total_revenue ?? 0), 0);
  const totalOutstanding = (reservations ?? []).reduce((s, r) => s + (r.outstanding_amount ?? 0), 0);
  const lastStay = (reservations ?? []).find((r) => r.booking_status === "checked_out");

  return (
    <div>
      {duplicateGuest && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning-600">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This guest looks similar to an existing profile:{" "}
            <Link href={`/guests/${duplicateGuest.id}`} className="font-medium underline">
              {duplicateGuest.first_name} {duplicateGuest.last_name} ({duplicateGuest.guest_number})
            </Link>
            . Review and merge manually if this is a duplicate.
          </span>
        </div>
      )}

      <PageHeader
        title={`${guest.title ? guest.title + " " : ""}${guest.first_name} ${guest.last_name}`}
        description={`${guest.guest_number}${guest.vip_status ? " · VIP Guest" : ""}`}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-slate-400">Bookings</p>
          <p className="text-xl font-semibold text-navy-900">{reservations?.length ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Lifetime Revenue</p>
          <p className="text-xl font-semibold text-navy-900">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Outstanding</p>
          <p className="text-xl font-semibold text-navy-900">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Last Stay</p>
          <p className="text-xl font-semibold text-navy-900">{lastStay ? formatDate(lastStay.departure_date) : "—"}</p>
        </div>
      </div>

      <TabsNav base={base} active={tab} tabs={TABS} />

      {tab === "overview" && <OverviewTab guest={guest} canEdit={canEdit} />}
      {tab === "bookings" && <BookingsTab reservations={(reservations ?? []) as any} />}
      {tab === "stays" && <StaysTab reservations={(reservations ?? []) as any} />}
      {tab === "diving" && <DivingTab guestId={guest.id} />}
      {tab === "restaurant" && <RestaurantTab />}
      {tab === "payments" && <PaymentsTab reservations={(reservations ?? []) as any} guestId={guest.id} />}
      {tab === "reviews" && <ReviewsTab guestId={guest.id} />}
      {tab === "communications" && <CommunicationsTab guestId={guest.id} />}
      {tab === "documents" && <DocumentsTab guestId={guest.id} />}
      {tab === "activity" && <ActivityTab guestId={guest.id} />}
    </div>
  );
}

function OverviewTab({ guest, canEdit }: { guest: any; canEdit: boolean }) {
  const updateWithId = updateGuest.bind(null, guest.id);
  return (
    <form action={updateWithId} className="card grid max-w-3xl grid-cols-1 gap-4 p-6 sm:grid-cols-2">
      <Field label="Title" name="title" defaultValue={guest.title} disabled={!canEdit} />
      <Field label="First name" name="first_name" defaultValue={guest.first_name} disabled={!canEdit} required />
      <Field label="Last name" name="last_name" defaultValue={guest.last_name} disabled={!canEdit} required />
      <Field label="Gender" name="gender" defaultValue={guest.gender} disabled={!canEdit} />
      <Field label="Date of birth" name="date_of_birth" type="date" defaultValue={guest.date_of_birth} disabled={!canEdit} />
      <Field label="Nationality" name="nationality" defaultValue={guest.nationality} disabled={!canEdit} />
      <Field label="Passport number" name="passport_number" defaultValue={guest.passport_number} disabled={!canEdit} />
      <Field label="Passport expiry" name="passport_expiry" type="date" defaultValue={guest.passport_expiry} disabled={!canEdit} />
      <Field label="Email" name="email" type="email" defaultValue={guest.email} disabled={!canEdit} />
      <Field label="Phone" name="phone" defaultValue={guest.phone} disabled={!canEdit} />
      <Field label="WhatsApp" name="whatsapp" defaultValue={guest.whatsapp} disabled={!canEdit} />
      <Field label="Country" name="country" defaultValue={guest.country} disabled={!canEdit} />
      <Field label="Preferred language" name="preferred_language" defaultValue={guest.preferred_language} disabled={!canEdit} />
      <div className="sm:col-span-2">
        <Field label="Address" name="address" defaultValue={guest.address} disabled={!canEdit} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="dietary_requirements">
          Dietary requirements
        </label>
        <textarea id="dietary_requirements" name="dietary_requirements" defaultValue={guest.dietary_requirements ?? ""} disabled={!canEdit} rows={2} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="special_requirements">
          Special requirements
        </label>
        <textarea id="special_requirements" name="special_requirements" defaultValue={guest.special_requirements ?? ""} disabled={!canEdit} rows={2} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea id="notes" name="notes" defaultValue={guest.notes ?? ""} disabled={!canEdit} rows={2} className="input" />
      </div>
      <label className="flex items-center gap-2 text-sm text-navy-700 sm:col-span-2">
        <input type="checkbox" name="vip_status" defaultChecked={guest.vip_status} disabled={!canEdit} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
        VIP guest
      </label>
      {canEdit && (
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  disabled,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} disabled={disabled} required={required} className="input" />
    </div>
  );
}

function BookingsTab({ reservations }: { reservations: (Reservation & { properties: { name: string } | null; room_types: { name: string } | null })[] }) {
  if (reservations.length === 0) {
    return <EmptyState icon={CalendarRange} title="No bookings yet" description="Reservations for this guest will appear here once synced from Pixel Booking Manager." />;
  }
  const columns: Column<(typeof reservations)[number]>[] = [
    { header: "Booking #", cell: (r) => r.booking_number },
    { header: "Property", cell: (r) => r.properties?.name ?? "—" },
    { header: "Arrival", cell: (r) => formatDate(r.arrival_date) },
    { header: "Departure", cell: (r) => formatDate(r.departure_date) },
    { header: "Room Type", cell: (r) => r.room_types?.name ?? "—" },
    { header: "Status", cell: (r) => <StatusBadge status={r.booking_status} tone={BOOKING_STATUS_TONE[r.booking_status]} /> },
    { header: "Revenue", cell: (r) => formatCurrency(r.total_revenue, r.currency) },
  ];
  return <DataTable columns={columns} rows={reservations} rowHref={(r) => `/reservations/${r.id}`} />;
}

function StaysTab({ reservations }: { reservations: any[] }) {
  const stays = reservations.filter((r) => ["checked_in", "checked_out"].includes(r.booking_status));
  if (stays.length === 0) {
    return <EmptyState icon={CalendarRange} title="No stays yet" description="Check-in and check-out history (owned by Pixel PMS) will appear here." />;
  }
  const columns: Column<(typeof stays)[number]>[] = [
    { header: "Booking #", cell: (r) => r.booking_number },
    { header: "Property", cell: (r) => r.properties?.name ?? "—" },
    { header: "Arrival", cell: (r) => formatDate(r.arrival_date) },
    { header: "Departure", cell: (r) => formatDate(r.departure_date) },
    { header: "Status", cell: (r) => <StatusBadge status={r.booking_status} tone={BOOKING_STATUS_TONE[r.booking_status]} /> },
  ];
  return <DataTable columns={columns} rows={stays} rowHref={(r) => `/reservations/${r.id}`} />;
}

async function DivingTab({ guestId }: { guestId: string }) {
  const supabase = createClient();
  const [{ data: profile }, { data: bookings }] = await Promise.all([
    supabase.from("dive_profiles").select("*").eq("guest_id", guestId).maybeSingle(),
    supabase.from("dive_bookings").select("*").eq("guest_id", guestId).order("dive_start_date", { ascending: false }),
  ]);

  if (!profile && (!bookings || bookings.length === 0)) {
    return <EmptyState icon={Waves} title="No dive history" description="Certification details and dive bookings will appear here once Pixel Diving is connected." />;
  }

  return (
    <div className="space-y-4">
      {profile && (
        <div className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
          <Info label="Certification" value={`${profile.certification_agency ?? "—"} · ${profile.certification_level ?? "—"}`} />
          <Info label="Number of dives" value={profile.number_of_dives?.toString() ?? "—"} />
          <Info label="Nitrox certified" value={profile.nitrox_certified ? "Yes" : "No"} />
          <Info label="BCD size" value={profile.bcd_size ?? "—"} />
          <Info label="Fins size" value={profile.fins_size ?? "—"} />
          <Info label="Wetsuit size" value={profile.wetsuit_size ?? "—"} />
        </div>
      )}
      {bookings && bookings.length > 0 && (
        <DataTable
          columns={[
            { header: "Package", cell: (b: any) => b.dive_package ?? "—" },
            { header: "Dates", cell: (b: any) => `${formatDate(b.dive_start_date)} → ${formatDate(b.dive_end_date)}` },
            { header: "Dives", cell: (b: any) => b.number_of_dives ?? "—" },
            { header: "Status", cell: (b: any) => titleCase(b.status) },
          ]}
          rows={bookings as any}
        />
      )}
    </div>
  );
}

function RestaurantTab() {
  return (
    <EmptyState
      icon={UtensilsCrossed}
      title="Owned by Pixel Restaurant Order Manager"
      description="Pixel Core shares guest, room and meal plan context with the Restaurant Order Manager — order history lives there."
    />
  );
}

function PaymentsTab({ reservations, guestId }: { reservations: any[]; guestId: string }) {
  if (reservations.length === 0) {
    return <EmptyState icon={Wallet} title="No payments yet" description="Payments recorded against this guest's bookings will appear here." />;
  }
  return (
    <DataTable
      columns={[
        { header: "Booking #", cell: (r) => r.booking_number },
        { header: "Total", cell: (r) => formatCurrency(r.total_revenue, r.currency) },
        { header: "Paid", cell: (r) => formatCurrency(r.amount_paid, r.currency) },
        { header: "Outstanding", cell: (r) => formatCurrency(r.outstanding_amount, r.currency) },
        { header: "Status", cell: (r) => titleCase(r.payment_status) },
      ]}
      rows={reservations}
      rowHref={(r) => `/reservations/${r.id}`}
    />
  );
}

async function ReviewsTab({ guestId }: { guestId: string }) {
  const supabase = createClient();
  const { data: reviews } = await supabase.from("reviews").select("*").eq("guest_id", guestId).order("review_date", { ascending: false });
  if (!reviews || reviews.length === 0) {
    return <EmptyState icon={Star} title="No reviews yet" description="Reviews synced from Pixel Reputation Manager after checkout will appear here." />;
  }
  return (
    <DataTable
      columns={[
        { header: "Platform", cell: (r: any) => titleCase(r.platform) },
        { header: "Rating", cell: (r: any) => (r.rating ? `${r.rating} / 5` : "—") },
        { header: "Date", cell: (r: any) => formatDate(r.review_date) },
        { header: "Response", cell: (r: any) => titleCase(r.response_status) },
      ]}
      rows={reviews as any}
    />
  );
}

async function CommunicationsTab({ guestId }: { guestId: string }) {
  const supabase = createClient();
  const { data: messages } = await supabase
    .from("communications")
    .select("*")
    .eq("guest_id", guestId)
    .order("occurred_at", { ascending: false });

  return (
    <div className="space-y-4">
      <form action={addCommunication} className="card space-y-3 p-4">
        <input type="hidden" name="guest_id" value={guestId} />
        <div className="grid grid-cols-2 gap-3">
          <select name="channel" className="input" defaultValue="internal_note">
            <option value="internal_note">Internal note</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
          </select>
          <select name="direction" className="input" defaultValue="internal">
            <option value="internal">Internal</option>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>
        </div>
        <textarea name="message" required rows={2} placeholder="Log a message or internal note…" className="input" />
        <button type="submit" className="btn-secondary">
          Log Communication
        </button>
      </form>

      {!messages || messages.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No communications logged" description="WhatsApp, email, phone and internal notes for this guest will appear here." />
      ) : (
        <div className="card divide-y divide-slate-100">
          {messages.map((m) => (
            <div key={m.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{titleCase(m.channel)}</span>
                <span className="text-xs text-slate-400">{formatDateTime(m.occurred_at)}</span>
              </div>
              {m.subject && <p className="mt-1 text-sm font-medium text-navy-900">{m.subject}</p>}
              <p className="mt-0.5 text-sm text-slate-600">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function DocumentsTab({ guestId }: { guestId: string }) {
  const supabase = createClient();
  const { data: files } = await supabase.from("files").select("*").eq("related_type", "guest").eq("related_id", guestId).order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <form action={uploadFile} encType="multipart/form-data" className="card flex flex-wrap items-end gap-3 p-4">
        <input type="hidden" name="related_type" value="guest" />
        <input type="hidden" name="related_id" value={guestId} />
        <select name="file_type" required className="input w-auto">
          <option value="">File type…</option>
          {["passport", "voucher", "invoice", "quotation", "rate_sheet", "factsheet", "contract", "other"].map((t) => (
            <option key={t} value={t}>
              {titleCase(t)}
            </option>
          ))}
        </select>
        <input type="file" name="file" required className="input w-auto" />
        <button type="submit" className="btn-secondary">
          Upload
        </button>
      </form>

      {!files || files.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No documents yet" description="Passports, vouchers and invoices linked to this guest will appear here." />
      ) : (
        <DataTable
          columns={[
            { header: "File", cell: (f: any) => f.file_name },
            { header: "Type", cell: (f: any) => titleCase(f.file_type) },
            { header: "Uploaded", cell: (f: any) => formatDate(f.created_at) },
            {
              header: "",
              cell: (f: any) => (
                <a href={`/api/files/${f.id}/download`} className="text-xs font-medium text-brand-600 hover:underline">
                  Download
                </a>
              ),
            },
          ]}
          rows={files as any}
        />
      )}
    </div>
  );
}

async function ActivityTab({ guestId }: { guestId: string }) {
  const supabase = createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*, profiles(first_name, last_name)")
    .eq("entity_type", "guest")
    .eq("entity_id", guestId)
    .order("created_at", { ascending: false });

  if (!logs || logs.length === 0) {
    return <EmptyState icon={History} title="No activity yet" description="Changes to this guest's profile will be tracked here." />;
  }

  return (
    <div className="card divide-y divide-slate-100">
      {logs.map((log: any) => (
        <div key={log.id} className="flex items-center justify-between px-4 py-3 text-sm">
          <span>
            <span className="font-medium text-navy-900">{log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : "System"}</span>{" "}
            <span className="text-slate-500">{titleCase(log.action)}</span>
          </span>
          <span className="text-xs text-slate-400">{timeAgo(log.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-navy-900">{value}</p>
    </div>
  );
}
