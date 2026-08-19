"use client";

import { useRef, useState } from "react";
import { ORDER_TYPES, Priority } from "@/lib/types";

const PRIORITY_OPTIONS: { value: Priority; label: string; dot: string }[] = [
  { value: "low", label: "Low", dot: "bg-slate-400" },
  { value: "medium", label: "Medium", dot: "bg-amber-500" },
  { value: "high", label: "High", dot: "bg-orange-500" },
  { value: "urgent", label: "Urgent", dot: "bg-red-500" },
];

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function RequestPage() {
  const [orderName, setOrderName] = useState("");
  const [orderType, setOrderType] = useState<string>(ORDER_TYPES[0]);
  const [clientName, setClientName] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [requestedDate, setRequestedDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickLogo(file: File | null) {
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  function resetForm() {
    setOrderName("");
    setOrderType(ORDER_TYPES[0]);
    setClientName("");
    setSponsor("");
    setRequestedDate(todayISO());
    setDueDate("");
    setPriority("medium");
    setDescription("");
    pickLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!orderName.trim() || !clientName.trim()) {
      setError("Please fill in the order name and client / team name.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("order_name", orderName.trim());
      fd.set("order_type", orderType);
      fd.set("client_name", clientName.trim());
      fd.set("sponsor", sponsor.trim());
      fd.set("requested_date", requestedDate);
      fd.set("due_date", dueDate);
      fd.set("priority", priority);
      fd.set("description", description.trim());
      if (logoFile) fd.set("logo", logoFile);

      const res = await fetch("/api/public/design-requests", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong submitting your request.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-design-400 focus:border-design-400 transition";
  const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

  if (done) {
    return (
      <div className="min-h-screen bg-[#f6f7f9] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-design-50 text-design mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="text-lg font-semibold text-slate-900 mb-1.5">Request submitted</h1>
          <p className="text-sm text-slate-500 mb-6">
            Thanks — your design request has landed in the pipeline. The team will pick it up shortly.
          </p>
          <button
            onClick={() => {
              resetForm();
              setDone(false);
            }}
            className="w-full rounded-lg bg-design hover:bg-design-700 text-white font-medium py-2.5 transition"
          >
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-hotel via-design to-freelance text-white font-bold shadow-card">
            W
          </span>
          <div>
            <p className="text-lg font-semibold text-slate-900 leading-tight">New Design Request</p>
            <p className="text-sm text-slate-500 leading-tight">Pixelate MV · Sublimation Printing</p>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 sm:p-8 space-y-6">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
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
                Type of order <span className="text-red-500">*</span>
              </label>
              <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className={inputCls}>
                {ORDER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
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
              <label className={labelCls}>Sponsor (if any)</label>
              <input
                value={sponsor}
                onChange={(e) => setSponsor(e.target.value)}
                placeholder="Sponsor / featured brand"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
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
                Delivery date needed <span className="text-red-500">*</span>
              </label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} required />
            </div>
          </div>

          <div>
            <label className={labelCls}>Priority level</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition ${
                    priority === p.value
                      ? "border-design bg-design-50 text-design-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Logo / reference image</label>
            {logoPreview ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt="Logo preview" className="h-14 w-14 rounded object-contain bg-slate-50 border border-slate-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{logoFile?.name}</p>
                  <p className="text-xs text-slate-400">{logoFile ? Math.round(logoFile.size / 1024) : 0} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    pickLogo(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-slate-400 hover:text-red-500 text-sm px-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-6 text-center cursor-pointer hover:border-design-300 hover:text-design transition text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path
                    d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm">Click to upload a logo or reference image</span>
                <span className="text-xs text-slate-400">PNG, JPG, WEBP, SVG or GIF — up to 8MB</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  onChange={(e) => pickLogo(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
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

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-design hover:bg-design-700 disabled:opacity-60 text-white font-medium py-3 transition"
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          This form goes straight into the design team&apos;s pipeline — no account needed.
        </p>
      </div>
    </div>
  );
}
