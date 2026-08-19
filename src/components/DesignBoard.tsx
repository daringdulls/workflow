"use client";

import { useState } from "react";
import {
  DESIGN_TYPES,
  DesignOrder,
  DesignStatus,
  ORDER_TYPES,
  Priority,
  PRIORITIES,
  PRIORITY_LABEL,
  formatOrderNumber,
} from "@/lib/types";
import PriorityBadge from "./PriorityBadge";

const COLUMNS: { key: DesignStatus; label: string; dot: string }[] = [
  { key: "new", label: "New", dot: "bg-slate-400" },
  { key: "in_progress", label: "In Progress", dot: "bg-design" },
  { key: "review", label: "Review", dot: "bg-amber-500" },
  { key: "delivered", label: "Delivered", dot: "bg-emerald-500" },
];

const STATUS_LABEL: Record<DesignStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  review: "Review",
  delivered: "Delivered",
};

function contactHref(contact: string): string | null {
  const c = contact.trim();
  if (!c) return null;
  if (/^https?:\/\//i.test(c)) return c;
  if (/^wa\.me\//i.test(c)) return `https://${c}`;
  const digits = c.replace(/[^\d+]/g, "");
  if (digits.length >= 6 && /^[\d+\s()-]+$/.test(c)) return `tel:${digits}`;
  return null;
}

function garmentPills(o: DesignOrder) {
  const pills: string[] = [];
  if (o.needs_shorts) pills.push("Shorts");
  if (o.needs_tracksuit) pills.push("Track suit");
  if (o.needs_skirt) pills.push("Skirt");
  return pills;
}

/** Small 4-segment progress bar showing how far along the pipeline this order is. */
function StatusProgress({ status }: { status: DesignStatus }) {
  const idx = COLUMNS.findIndex((c) => c.key === status);
  return (
    <div className="flex items-center gap-1">
      {COLUMNS.map((c, i) => (
        <span
          key={c.key}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i <= idx
              ? status === "delivered"
                ? "bg-emerald-500"
                : "bg-design"
              : "bg-slate-150 dark:bg-slate-700"
          }`}
        />
      ))}
    </div>
  );
}

export default function DesignBoard({
  orders,
  onAdd,
  onUpdate,
  onDelete,
}: {
  orders: DesignOrder[];
  onAdd: (o: {
    order_name: string;
    order_type: string;
    design_type: string;
    client_name: string;
    contact: string;
    sponsor: string;
    description: string;
    priority: Priority;
    requested_date: string | null;
    due_date: string | null;
  }) => void;
  onUpdate: (id: number, patch: Partial<DesignOrder>) => void;
  onDelete: (id: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [orderName, setOrderName] = useState("");
  const [orderType, setOrderType] = useState<string>(ORDER_TYPES[0]);
  const [designType, setDesignType] = useState<string>(DESIGN_TYPES[1]);
  const [client, setClient] = useState("");
  const [contact, setContact] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [selected, setSelected] = useState<DesignOrder | null>(null);
  const inputCls =
    "rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderName.trim() || !client.trim()) return;
    onAdd({
      order_name: orderName.trim(),
      order_type: orderType,
      design_type: designType,
      client_name: client.trim(),
      contact: contact.trim(),
      sponsor: sponsor.trim(),
      description: desc.trim(),
      priority,
      requested_date: null,
      due_date: due || null,
    });
    setOrderName("");
    setOrderType(ORDER_TYPES[0]);
    setDesignType(DESIGN_TYPES[1]);
    setClient("");
    setContact("");
    setSponsor("");
    setDesc("");
    setPriority("medium");
    setDue("");
    setAdding(false);
  }

  function move(order: DesignOrder, dir: 1 | -1) {
    const idx = COLUMNS.findIndex((c) => c.key === order.status);
    const next = COLUMNS[idx + dir];
    if (next) onUpdate(order.id, { status: next.key });
  }

  function copyShareLink() {
    const url = `${window.location.origin}/request`;
    navigator.clipboard?.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-design" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Design Requests</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyShareLink}
            className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 border border-design-200 dark:border-design/40 text-design dark:text-design-400 hover:bg-design-50 dark:hover:bg-design/10 transition"
            title="Copy the public request-form link to share with staff"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1.1 1.1M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07l1.1-1.1"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {shareCopied ? "Link copied!" : "Share request form"}
          </button>
          <button
            onClick={() => setAdding((v) => !v)}
            className="text-sm font-medium text-white rounded-lg px-3 py-1.5 bg-design hover:bg-design-700 transition"
          >
            {adding ? "Cancel" : "+ New order"}
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
        Share the request form with your design staff so they can submit orders directly into this pipeline — no login needed.
        Click any card below to see its full details.
      </p>

      {adding && (
        <form
          onSubmit={submit}
          className="flex flex-wrap gap-2 mb-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800"
        >
          <input
            value={orderName}
            onChange={(e) => setOrderName(e.target.value)}
            placeholder="Order name"
            className={`flex-1 min-w-[160px] ${inputCls}`}
          />
          <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className={`text-sm ${inputCls}`}>
            {ORDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={designType} onChange={(e) => setDesignType(e.target.value)} className={`text-sm ${inputCls}`}>
            {DESIGN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Client / team name"
            className={`flex-1 min-w-[140px] ${inputCls}`}
          />
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Contact / WhatsApp link"
            className={`flex-1 min-w-[140px] ${inputCls}`}
          />
          <input
            value={sponsor}
            onChange={(e) => setSponsor(e.target.value)}
            placeholder="Sponsor (optional)"
            className={`flex-1 min-w-[140px] ${inputCls}`}
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Other relevant information"
            className={`flex-[2] min-w-[180px] ${inputCls}`}
          />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`text-sm ${inputCls}`} />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className={`text-sm ${inputCls}`}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-design hover:bg-design-700 text-white px-4 py-1.5 text-sm font-medium">
            Add
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.key);
          return (
            <div key={col.key} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                  {col.label}
                </span>
                <span className="text-slate-400 dark:text-slate-500">{colOrders.length}</span>
              </p>
              <div className="space-y-2">
                {colOrders.map((o) => {
                  const pills = garmentPills(o);
                  return (
                    <div
                      key={o.id}
                      onClick={() => setSelected(o)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setSelected(o);
                      }}
                      className="cursor-pointer bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-card hover:shadow-card-hover hover:border-design-200 dark:hover:border-design/40 transition"
                    >
                      <div className="flex items-start gap-2 mb-1.5">
                        {o.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={o.logo_url}
                            alt=""
                            className="h-9 w-9 rounded object-contain bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-design-50 dark:bg-design/15 text-design dark:text-design-400">
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                              <path
                                d="M4 16l4.5-6 3.5 4 2.5-3L20 16M4 6h16v12H4V6Z"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 tracking-wide">
                            {formatOrderNumber(o.id)}
                          </p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{o.order_name || o.client_name}</p>
                          <p className="text-xs text-design dark:text-design-400 truncate">
                            {o.order_type}
                            {o.design_type ? <span className="text-slate-400 dark:text-slate-500"> · {o.design_type}</span> : null}
                          </p>
                        </div>
                        <PriorityBadge priority={o.priority} />
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        {o.client_name}
                        {o.sponsor ? <span className="text-slate-400 dark:text-slate-500"> · Sponsor: {o.sponsor}</span> : null}
                      </p>

                      {pills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {pills.map((p) => (
                            <span
                              key={p}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}

                      {o.description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">{o.description}</p>}
                      {(o.requested_date || o.due_date) && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                          {o.requested_date && <>Requested {new Date(o.requested_date).toLocaleDateString()}</>}
                          {o.requested_date && o.due_date && " · "}
                          {o.due_date && <>Due {new Date(o.due_date).toLocaleDateString()}</>}
                        </p>
                      )}

                      <div className="mb-2">
                        <StatusProgress status={o.status} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          <button
                            disabled={col.key === "new"}
                            onClick={(e) => {
                              e.stopPropagation();
                              move(o, -1);
                            }}
                            className="text-xs px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30"
                          >
                            ←
                          </button>
                          <button
                            disabled={col.key === "delivered"}
                            onClick={(e) => {
                              e.stopPropagation();
                              move(o, 1);
                            }}
                            className="text-xs px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30"
                          >
                            →
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(o.id);
                          }}
                          className="text-slate-300 dark:text-slate-600 hover:text-red-500 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
                {colOrders.length === 0 && <p className="text-xs text-slate-300 dark:text-slate-600 text-center py-4">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onUpdate={(patch) => {
            onUpdate(selected.id, patch);
            setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
          }}
          onDelete={() => {
            onDelete(selected.id);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 dark:text-slate-100">{value || "—"}</p>
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onUpdate,
  onDelete,
}: {
  order: DesignOrder;
  onClose: () => void;
  onUpdate: (patch: Partial<DesignOrder>) => void;
  onDelete: () => void;
}) {
  const href = order.contact ? contactHref(order.contact) : null;
  const pills = garmentPills(order);
  const numbers = [
    order.number_front && `Front ${order.number_front}`,
    order.number_back && `Back ${order.number_back}`,
    order.number_shorts && `Shorts ${order.number_shorts}`,
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex items-start gap-4 mb-2 pr-8">
          {order.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={order.logo_url}
              alt=""
              className="h-16 w-16 rounded-lg object-contain bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shrink-0"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-design-50 dark:bg-design/15 text-design dark:text-design-400">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                <path
                  d="M4 16l4.5-6 3.5 4 2.5-3L20 16M4 6h16v12H4V6Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[11px] font-mono font-semibold text-design dark:text-design-400 tracking-wide mb-0.5">
              {formatOrderNumber(order.id)}
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {order.order_name || "Untitled order"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {order.order_type}
              {order.design_type ? <span> · {order.design_type}</span> : null}
            </p>
          </div>
        </div>

        <div className="mb-5">
          <StatusProgress status={order.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <DetailField label="Client / team" value={order.client_name} />
          <DetailField
            label="Contact / WhatsApp"
            value={
              order.contact ? (
                href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-design dark:text-design-400 hover:underline">
                    {order.contact}
                  </a>
                ) : (
                  order.contact
                )
              ) : null
            }
          />
          <DetailField label="Requested date" value={order.requested_date ? new Date(order.requested_date).toLocaleDateString() : null} />
          <DetailField label="Delivery date" value={order.due_date ? new Date(order.due_date).toLocaleDateString() : null} />
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Priority</p>
            <PriorityBadge priority={order.priority} />
          </div>
          <DetailField label="Submitted" value={new Date(order.created_at).toLocaleString()} />
        </div>

        {(order.sponsor || order.sponsor_logo_url) && (
          <div className="flex items-center gap-3 mb-5 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
            {order.sponsor_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={order.sponsor_logo_url}
                alt=""
                className="h-11 w-11 rounded object-contain bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shrink-0"
              />
            ) : null}
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Sponsor</p>
              <p className="text-sm text-slate-800 dark:text-slate-100">{order.sponsor || "—"}</p>
            </div>
            {order.sponsor_logo_url && (
              <a
                href={order.sponsor_logo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-design dark:text-design-400 hover:underline shrink-0"
              >
                Open full-size
              </a>
            )}
          </div>
        )}

        {(pills.length > 0 || order.neck_type || order.sleeve_type || numbers.length > 0) && (
          <div className="mb-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">Garment details</p>
            <div className="flex flex-wrap gap-1.5">
              {order.neck_type && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-design-50 dark:bg-design/15 text-design dark:text-design-400">
                  Neck: {order.neck_type}
                </span>
              )}
              {order.sleeve_type && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-design-50 dark:bg-design/15 text-design dark:text-design-400">
                  Sleeve: {order.sleeve_type}
                </span>
              )}
              {pills.map((p) => (
                <span
                  key={p}
                  className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {p}
                </span>
              ))}
              {numbers.map((n) => (
                <span
                  key={n}
                  className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400"
                >
                  # {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {order.reference_notes && (
          <div className="mb-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Ideal design / reference</p>
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              {order.reference_notes}
            </p>
          </div>
        )}

        {order.description && (
          <div className="mb-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Other relevant information</p>
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              {order.description}
            </p>
          </div>
        )}

        {order.logo_url && (
          <a
            href={order.logo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-design dark:text-design-400 hover:underline mb-5"
          >
            Open full-size logo
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">Status</label>
            <select
              value={order.status}
              onChange={(e) => onUpdate({ status: e.target.value as DesignStatus })}
              className="text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 px-2.5 py-1.5"
            >
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={onDelete}
            className="text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg px-3 py-1.5 transition"
          >
            Delete order
          </button>
        </div>
      </div>
    </div>
  );
}
