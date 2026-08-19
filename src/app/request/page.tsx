"use client";

import { Fragment, useRef, useState } from "react";
import {
  DESIGN_TYPES,
  JERSEY_ROLES,
  JerseyRole,
  NECK_TYPES,
  ORDER_TYPES,
  Priority,
  SLEEVE_TYPES,
  formatOrderNumber,
} from "@/lib/types";

const PRIORITY_OPTIONS: { value: Priority; label: string; dot: string }[] = [
  { value: "low", label: "Low", dot: "bg-slate-400" },
  { value: "medium", label: "Medium", dot: "bg-amber-500" },
  { value: "high", label: "High", dot: "bg-orange-500" },
  { value: "urgent", label: "Urgent", dot: "bg-red-500" },
];

const GARMENT_OPTIONS: { key: "shorts" | "tracksuit" | "skirt"; label: string }[] = [
  { key: "shorts", label: "Shorts" },
  { key: "tracksuit", label: "Track suit" },
  { key: "skirt", label: "Skirt" },
];

const STATUS_META: Record<string, { label: string; step: number }> = {
  new: { label: "New", step: 0 },
  in_progress: { label: "In Progress", step: 1 },
  review: { label: "Review", step: 2 },
  delivered: { label: "Delivered", step: 3 },
};

const TRACK_STAGES = ["Request Submitted", "In Progress", "In Review", "Delivered"];

const WIZARD_STEPS = [
  { title: "Order Details", subtitle: "What are we making, and who is it for?" },
  { title: "Design Specifications", subtitle: "Artwork, garment details, and numbering." },
  { title: "Additional Information", subtitle: "Anything else the design team should know." },
  { title: "Review & Submit", subtitle: "Double-check everything before sending it off." },
];

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-7 sm:mb-9">
      {WIZARD_STEPS.map((s, i) => (
        <Fragment key={s.title}>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <span
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition ${
                i < current
                  ? "bg-teal-500 text-white"
                  : i === current
                  ? "bg-teal-600 text-white ring-4 ring-teal-100"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {i < current ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span
              className={`hidden sm:block text-[11px] font-medium text-center max-w-[6.5rem] leading-tight ${
                i === current ? "text-teal-700" : "text-slate-400"
              }`}
            >
              {s.title}
            </span>
          </div>
          {i < WIZARD_STEPS.length - 1 && (
            <span className={`flex-1 h-0.5 mx-1.5 sm:mx-2 rounded-full transition ${i < current ? "bg-teal-500" : "bg-slate-200"}`} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base sm:text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function ImageDrop({
  label,
  hint,
  file,
  preview,
  onPick,
  onClear,
}: {
  label: string;
  hint: string;
  file: File | null;
  preview: string | null;
  onPick: (f: File | null) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      {preview ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="h-14 w-14 rounded-lg object-contain bg-white border border-slate-100" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 truncate">{file?.name}</p>
            <p className="text-xs text-slate-400">{file ? Math.round(file.size / 1024) : 0} KB</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClear();
              if (ref.current) ref.current.value = "";
            }}
            className="text-slate-400 hover:text-red-500 text-sm px-2"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-5 text-center cursor-pointer hover:border-teal-300 hover:bg-teal-50/40 hover:text-teal-600 transition text-slate-400">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xs font-medium">{hint}</span>
          <span className="text-[11px] text-slate-400">PNG, JPG, WEBP, SVG or GIF — up to 8MB</span>
          <input
            ref={ref}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800 font-medium mt-0.5">{value}</dd>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <button type="button" onClick={onEdit} className="text-xs font-medium text-teal-600 hover:text-teal-700">
          Edit
        </button>
      </div>
      <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
    </div>
  );
}

interface SponsorRow {
  key: number;
  name: string;
  file: File | null;
  preview: string | null;
}

function TrackOrder() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/public/track?order=${encodeURIComponent(query.trim())}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't find that order.");
      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const meta = result ? STATUS_META[result.status] ?? STATUS_META.new : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 sm:p-8">
      <p className="text-sm text-slate-500 mb-4">Enter your order number (e.g. WF-00042) to check its progress.</p>
      <form onSubmit={submit} className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="WF-00042"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60 text-white font-semibold px-5 text-sm transition shadow-card"
        >
          {loading ? "Checking…" : "Track"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">{error}</p>}

      {result && meta && (
        <div className="rounded-xl border border-slate-100 p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-5">
            {result.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.logo_url} alt="" className="h-12 w-12 rounded-lg object-contain bg-slate-50 border border-slate-100 shrink-0" />
            ) : null}
            <div className="min-w-0">
              <p className="text-[11px] font-mono font-semibold text-teal-600 tracking-wide">{formatOrderNumber(result.id)}</p>
              <p className="text-base font-semibold text-slate-900 truncate">{result.order_name || "Untitled order"}</p>
              <p className="text-sm text-slate-500">
                {result.order_type}
                {result.design_type ? ` · ${result.design_type}` : ""}
              </p>
            </div>
            <span
              className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                result.status === "delivered" ? "bg-emerald-50 text-emerald-700" : "bg-teal-50 text-teal-700"
              }`}
            >
              {meta.label}
            </span>
          </div>

          {/* Named-stage tracker */}
          <div className="flex items-center mb-6">
            {TRACK_STAGES.map((label, i) => (
              <Fragment key={label}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                      i < meta.step
                        ? "bg-teal-500 text-white"
                        : i === meta.step
                        ? result.status === "delivered"
                          ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                          : "bg-teal-600 text-white ring-4 ring-teal-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {i < meta.step ? (
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className={`hidden sm:block text-[10px] text-center max-w-[4.5rem] leading-tight ${i <= meta.step ? "text-slate-600 font-medium" : "text-slate-400"}`}>
                    {label}
                  </span>
                </div>
                {i < TRACK_STAGES.length - 1 && (
                  <span className={`flex-1 h-0.5 mx-1 rounded-full ${i < meta.step ? "bg-teal-500" : "bg-slate-200"}`} />
                )}
              </Fragment>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-400">Requested</p>
              <p className="text-slate-700 font-medium">{result.requested_date ? new Date(result.requested_date).toLocaleDateString() : "—"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-400">Expected delivery</p>
              <p className="text-slate-700 font-medium">{result.due_date ? new Date(result.due_date).toLocaleDateString() : "—"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RequestPage() {
  const [tab, setTab] = useState<"submit" | "track">("submit");
  const [step, setStep] = useState(0);

  const [orderName, setOrderName] = useState("");
  const [orderType, setOrderType] = useState<string>(ORDER_TYPES[0]);
  const [designType, setDesignType] = useState<string>(DESIGN_TYPES[1]);
  const [clientName, setClientName] = useState("");
  const [contact, setContact] = useState("");
  const [requestedDate, setRequestedDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");
  const [referenceNotes, setReferenceNotes] = useState("");
  const [neckType, setNeckType] = useState("");
  const [sleeveTypes, setSleeveTypes] = useState<Set<string>>(new Set());
  const [garments, setGarments] = useState<Set<string>>(new Set());
  const [jerseyRoles, setJerseyRoles] = useState<Set<JerseyRole>>(new Set());
  const [needsNumbering, setNeedsNumbering] = useState(false);
  const [numberFront, setNumberFront] = useState("");
  const [numberBack, setNumberBack] = useState("");
  const [numberShorts, setNumberShorts] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([{ key: 0, name: "", file: null, preview: null }]);
  const nextSponsorKey = useRef(1);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  function pickLogo(file: File | null) {
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }
  function toggleSet<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function addSponsorRow() {
    setSponsors((prev) => [...prev, { key: nextSponsorKey.current++, name: "", file: null, preview: null }]);
  }
  function updateSponsorName(key: number, name: string) {
    setSponsors((prev) => prev.map((s) => (s.key === key ? { ...s, name } : s)));
  }
  function updateSponsorFile(key: number, file: File | null) {
    setSponsors((prev) =>
      prev.map((s) => {
        if (s.key !== key) return s;
        if (s.preview) URL.revokeObjectURL(s.preview);
        return { ...s, file, preview: file ? URL.createObjectURL(file) : null };
      })
    );
  }
  function removeSponsorRow(key: number) {
    setSponsors((prev) => {
      const row = prev.find((s) => s.key === key);
      if (row?.preview) URL.revokeObjectURL(row.preview);
      const next = prev.filter((s) => s.key !== key);
      return next.length > 0 ? next : [{ key: nextSponsorKey.current++, name: "", file: null, preview: null }];
    });
  }

  function resetForm() {
    setOrderName("");
    setOrderType(ORDER_TYPES[0]);
    setDesignType(DESIGN_TYPES[1]);
    setClientName("");
    setContact("");
    setRequestedDate(todayISO());
    setDueDate("");
    setPriority("medium");
    setDescription("");
    setReferenceNotes("");
    setNeckType("");
    setSleeveTypes(new Set());
    setGarments(new Set());
    setJerseyRoles(new Set());
    setNeedsNumbering(false);
    setNumberFront("");
    setNumberBack("");
    setNumberShorts("");
    pickLogo(null);
    setSponsors([{ key: nextSponsorKey.current++, name: "", file: null, preview: null }]);
    setStep(0);
  }

  function validateStep(idx: number): string | null {
    if (idx === 0) {
      if (!orderName.trim()) return "Please enter an order name.";
      if (!clientName.trim()) return "Please enter the client / team name.";
      if (!dueDate) return "Please choose an expected delivery date.";
      if (designType === "Jersey" && jerseyRoles.size === 0) {
        return "For Jersey orders, select at least one type: Player, Keeper, Libero, or Official.";
      }
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }
  function goBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step < WIZARD_STEPS.length - 1) {
      goNext();
      return;
    }
    setError("");
    if (!orderName.trim() || !clientName.trim()) {
      setError("Please fill in the order name and client / team name.");
      return;
    }
    if (designType === "Jersey" && jerseyRoles.size === 0) {
      setError("For Jersey orders, select at least one type: Player, Keeper, Libero, or Official.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("order_name", orderName.trim());
      fd.set("order_type", orderType);
      fd.set("design_type", designType);
      fd.set("client_name", clientName.trim());
      fd.set("contact", contact.trim());
      fd.set("requested_date", requestedDate);
      fd.set("due_date", dueDate);
      fd.set("priority", priority);
      fd.set("description", description.trim());
      fd.set("reference_notes", referenceNotes.trim());
      fd.set("neck_type", neckType);
      for (const s of sleeveTypes) fd.append("sleeve_types", s);
      fd.set("needs_shorts", String(garments.has("shorts")));
      fd.set("needs_tracksuit", String(garments.has("tracksuit")));
      fd.set("needs_skirt", String(garments.has("skirt")));
      fd.set("role_player", String(jerseyRoles.has("Player")));
      fd.set("role_keeper", String(jerseyRoles.has("Keeper")));
      fd.set("role_libero", String(jerseyRoles.has("Libero")));
      fd.set("role_official", String(jerseyRoles.has("Official")));
      fd.set("needs_numbering", String(needsNumbering));
      if (needsNumbering) {
        fd.set("number_front", numberFront.trim());
        fd.set("number_back", numberBack.trim());
        fd.set("number_shorts", numberShorts.trim());
      }
      if (logoFile) fd.set("logo", logoFile);

      const validSponsors = sponsors.filter((s) => s.name.trim() || s.file);
      fd.set("sponsors_count", String(validSponsors.length));
      validSponsors.forEach((s, i) => {
        fd.set(`sponsor_name_${i}`, s.name.trim());
        if (s.file) fd.set(`sponsor_logo_${i}`, s.file);
      });

      const res = await fetch("/api/public/design-requests", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Something went wrong submitting your request.");
      }
      setOrderNumber(typeof body.id === "number" ? formatOrderNumber(body.id) : null);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition";
  const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";
  const cardCls = "bg-white rounded-2xl border border-slate-200/80 shadow-card p-5 sm:p-8";
  const chipCls = (active: boolean) =>
    `rounded-lg border px-2 py-2.5 text-sm font-medium transition ${
      active ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-500 hover:border-slate-300"
    }`;
  const validSponsors = sponsors.filter((s) => s.name.trim() || s.file);

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 via-cyan-50/40 to-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600 mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="text-lg font-semibold text-slate-900 mb-1.5">Request submitted</h1>
          {orderNumber && (
            <p className="inline-block text-xs font-mono font-semibold tracking-wide text-teal-700 bg-teal-50 rounded-full px-3 py-1 mb-3">
              {orderNumber}
            </p>
          )}
          <p className="text-sm text-slate-500 mb-6">
            Thanks — your design request has landed in the pipeline. Keep your order number to track its progress anytime.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                resetForm();
                setDone(false);
              }}
              className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-3 shadow-card transition"
            >
              Submit another request
            </button>
            <button
              onClick={() => {
                resetForm();
                setDone(false);
                setTab("track");
              }}
              className="w-full rounded-xl border border-slate-200 text-slate-600 font-medium py-2.5 transition hover:bg-slate-50"
            >
              Track this order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-cyan-50/40 to-slate-50 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-teal-500 to-emerald-400 text-white font-bold shadow-card">
            W
          </span>
          <div>
            <p className="text-lg font-semibold text-slate-900 leading-tight">
              {tab === "submit" ? "New Design Request" : "Track Your Request"}
            </p>
            <p className="text-sm text-slate-500 leading-tight">Pixelate MV · Sublimation Printing</p>
          </div>
        </div>

        <div className="flex gap-1.5 mb-6 bg-white rounded-xl border border-slate-200/80 p-1 shadow-card w-fit">
          <button
            onClick={() => setTab("submit")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "submit" ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Submit request
          </button>
          <button
            onClick={() => setTab("track")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "track" ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Track order
          </button>
        </div>

        {tab === "track" ? (
          <TrackOrder />
        ) : (
          <>
            <Stepper current={step} />

            <form onSubmit={submit} className={cardCls}>
              {/* Step 1: Order Details */}
              {step === 0 && (
                <div>
                  <StepHeader title={WIZARD_STEPS[0].title} subtitle={WIZARD_STEPS[0].subtitle} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelCls}>
                        Order name <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={orderName}
                        onChange={(e) => setOrderName(e.target.value)}
                        placeholder="e.g. Home Jersey — Blue Marlins FC"
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        Order type <span className="text-red-500">*</span>
                      </label>
                      <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className={inputCls}>
                        {ORDER_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Design type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {DESIGN_TYPES.map((t) => (
                          <button key={t} type="button" onClick={() => setDesignType(t)} className={chipCls(designType === t)}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {designType === "Jersey" && (
                      <div className="sm:col-span-2">
                        <label className={labelCls}>
                          Jersey for <span className="text-red-500">*</span>
                          <span className="text-xs text-slate-400 font-normal"> — select at least one</span>
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {JERSEY_ROLES.map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => toggleSet(setJerseyRoles, r)}
                              className={chipCls(jerseyRoles.has(r))}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className={labelCls}>
                        Client / team name <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Who is this order for?"
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Contact / WhatsApp group link</label>
                      <input
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="Phone number or WhatsApp group link"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Requested date</label>
                      <input
                        type="date"
                        value={requestedDate}
                        onChange={(e) => setRequestedDate(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        Expected delivery date <span className="text-red-500">*</span>
                      </label>
                      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} required />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Priority level</label>
                      <div className="grid grid-cols-4 gap-2">
                        {PRIORITY_OPTIONS.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setPriority(p.value)}
                            className={`flex items-center justify-center gap-1.5 ${chipCls(priority === p.value)}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Design Specifications */}
              {step === 1 && (
                <div>
                  <StepHeader title={WIZARD_STEPS[1].title} subtitle={WIZARD_STEPS[1].subtitle} />

                  <div className="mb-5">
                    <ImageDrop
                      label="Logo"
                      hint="Click to upload the main logo"
                      file={logoFile}
                      preview={logoPreview}
                      onPick={pickLogo}
                      onClear={() => pickLogo(null)}
                    />
                  </div>

                  <label className={labelCls}>Sponsors (if any)</label>
                  <div className="space-y-3 mb-1">
                    {sponsors.map((s, idx) => (
                      <div key={s.key} className="rounded-xl border border-slate-100 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            value={s.name}
                            onChange={(e) => updateSponsorName(s.key, e.target.value)}
                            placeholder={`Sponsor ${idx + 1} name`}
                            className={inputCls}
                          />
                          {sponsors.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSponsorRow(s.key)}
                              className="text-slate-400 hover:text-red-500 text-sm px-2 shrink-0"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <ImageDrop
                          label=""
                          hint={`Upload sponsor ${idx + 1} logo`}
                          file={s.file}
                          preview={s.preview}
                          onPick={(f) => updateSponsorFile(s.key, f)}
                          onClear={() => updateSponsorFile(s.key, null)}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addSponsorRow}
                    className="mb-6 text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    + Add another sponsor
                  </button>

                  <div className="grid sm:grid-cols-2 gap-4 mb-5 pt-5 border-t border-slate-100">
                    <div>
                      <label className={labelCls}>Neck type</label>
                      <select value={neckType} onChange={(e) => setNeckType(e.target.value)} className={inputCls}>
                        <option value="">Not specified</option>
                        {NECK_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>
                        Sleeve type <span className="text-xs text-slate-400 font-normal">— select any that apply</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {SLEEVE_TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleSet(setSleeveTypes, t as string)}
                            className={`${chipCls(sleeveTypes.has(t))} text-left`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className={labelCls}>Additional pieces needed</label>
                    <div className="grid grid-cols-3 gap-2">
                      {GARMENT_OPTIONS.map((g) => (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => toggleSet(setGarments, g.key as string)}
                          className={chipCls(garments.has(g.key))}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-5 border-t border-slate-100">
                    <label className={labelCls}>Does this order need player numbers?</label>
                    <div className="grid grid-cols-2 gap-2 mb-4 max-w-xs">
                      <button type="button" onClick={() => setNeedsNumbering(true)} className={chipCls(needsNumbering)}>
                        Yes
                      </button>
                      <button type="button" onClick={() => setNeedsNumbering(false)} className={chipCls(!needsNumbering)}>
                        No
                      </button>
                    </div>
                    {needsNumbering && (
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <label className={labelCls}>Front number</label>
                          <input value={numberFront} onChange={(e) => setNumberFront(e.target.value)} placeholder="e.g. 9" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Back number</label>
                          <input value={numberBack} onChange={(e) => setNumberBack(e.target.value)} placeholder="e.g. 9" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Shorts number (if any)</label>
                          <input
                            value={numberShorts}
                            onChange={(e) => setNumberShorts(e.target.value)}
                            placeholder="e.g. 9"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Additional Information */}
              {step === 2 && (
                <div>
                  <StepHeader title={WIZARD_STEPS[2].title} subtitle={WIZARD_STEPS[2].subtitle} />
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Ideal design / reference</label>
                      <textarea
                        value={referenceNotes}
                        onChange={(e) => setReferenceNotes(e.target.value)}
                        placeholder="Describe or link a design you'd like this to look like — style, layout, past order, etc."
                        rows={4}
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Other relevant information</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Sizes, colors, quantities, placement notes, deadlines to know about…"
                        rows={4}
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review & Submit */}
              {step === 3 && (
                <div>
                  <StepHeader title={WIZARD_STEPS[3].title} subtitle={WIZARD_STEPS[3].subtitle} />
                  <div className="space-y-3">
                    <ReviewSection title="Order details" onEdit={() => setStep(0)}>
                      <ReviewItem label="Order name" value={orderName} />
                      <ReviewItem label="Order type" value={orderType} />
                      <ReviewItem
                        label="Design type"
                        value={designType === "Jersey" && jerseyRoles.size > 0 ? `${designType} — ${Array.from(jerseyRoles).join(", ")}` : designType}
                      />
                      <ReviewItem label="Client / team" value={clientName} />
                      <ReviewItem label="Contact" value={contact} />
                      <ReviewItem label="Requested date" value={requestedDate} />
                      <ReviewItem label="Expected delivery" value={dueDate} />
                      <ReviewItem label="Priority" value={PRIORITY_OPTIONS.find((p) => p.value === priority)?.label} />
                    </ReviewSection>

                    <ReviewSection title="Design specifications" onEdit={() => setStep(1)}>
                      <ReviewItem label="Logo" value={logoFile ? logoFile.name : "No logo uploaded"} />
                      <ReviewItem
                        label="Sponsors"
                        value={validSponsors.length > 0 ? validSponsors.map((s) => s.name || "Unnamed sponsor").join(", ") : "None"}
                      />
                      <ReviewItem label="Neck type" value={neckType || "Not specified"} />
                      <ReviewItem label="Sleeve type" value={sleeveTypes.size > 0 ? Array.from(sleeveTypes).join(", ") : "Not specified"} />
                      <ReviewItem
                        label="Additional pieces"
                        value={GARMENT_OPTIONS.filter((g) => garments.has(g.key)).map((g) => g.label).join(", ") || "None"}
                      />
                      <ReviewItem
                        label="Numbering"
                        value={
                          needsNumbering
                            ? `Yes — Front: ${numberFront || "—"}, Back: ${numberBack || "—"}, Shorts: ${numberShorts || "—"}`
                            : "No"
                        }
                      />
                    </ReviewSection>

                    <ReviewSection title="Additional information" onEdit={() => setStep(2)}>
                      <ReviewItem label="Ideal design / reference" value={referenceNotes || "—"} />
                      <ReviewItem label="Other information" value={description || "—"} />
                    </ReviewSection>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mt-5">{error}</p>}

              <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 0}
                  className="rounded-xl border border-slate-200 text-slate-600 font-medium px-4 py-2.5 text-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  ← Back
                </button>
                {step < WIZARD_STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold px-5 py-2.5 text-sm shadow-card transition"
                  >
                    Next: {WIZARD_STEPS[step + 1].title} →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 text-sm shadow-card transition"
                  >
                    {submitting ? "Submitting…" : "Submit Request"}
                  </button>
                )}
              </div>
            </form>

            <p className="text-center text-xs text-slate-400 mt-6">
              This form goes straight into the design team&apos;s pipeline — no account needed.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
