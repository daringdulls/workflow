// Central status → color/label mapping so every module renders badges consistently.

export type Tone = "slate" | "blue" | "emerald" | "amber" | "red" | "violet" | "cyan";

const TONE_CLASSES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-success-50 text-success-600",
  amber: "bg-warning-50 text-warning-600",
  red: "bg-danger-50 text-danger-600",
  violet: "bg-violet-50 text-violet-700",
  cyan: "bg-cyan-50 text-cyan-700",
};

export function toneClass(tone: Tone) {
  return TONE_CLASSES[tone];
}

export const BOOKING_STATUS_TONE: Record<string, Tone> = {
  inquiry: "slate",
  quotation: "cyan",
  tentative: "amber",
  confirmed: "blue",
  checked_in: "emerald",
  checked_out: "violet",
  cancelled: "red",
  no_show: "red",
};

export const PAYMENT_STATUS_TONE: Record<string, Tone> = {
  unpaid: "red",
  partially_paid: "amber",
  paid: "emerald",
  refunded: "slate",
};

export const LEAD_STATUS_TONE: Record<string, Tone> = {
  new: "blue",
  contacted: "cyan",
  qualified: "violet",
  quotation: "amber",
  follow_up: "amber",
  won: "emerald",
  lost: "red",
};

export const QUOTATION_STATUS_TONE: Record<string, Tone> = {
  draft: "slate",
  sent: "blue",
  viewed: "cyan",
  accepted: "emerald",
  rejected: "red",
  expired: "slate",
  converted: "violet",
};

export const APP_CONNECTION_TONE: Record<string, Tone> = {
  connected: "emerald",
  disconnected: "slate",
  syncing: "blue",
  error: "red",
  coming_soon: "slate",
};

export const EVENT_STATUS_TONE: Record<string, Tone> = {
  pending: "slate",
  processing: "blue",
  completed: "emerald",
  failed: "red",
};

export const AI_DRAFT_STATUS_TONE: Record<string, Tone> = {
  pending: "amber",
  human_required: "red",
  approved: "blue",
  sent: "emerald",
  rejected: "slate",
};

export const SYNC_STATUS_TONE: Record<string, Tone> = {
  pending: "slate",
  syncing: "blue",
  synced: "emerald",
  error: "red",
};

export const USER_STATUS_TONE: Record<string, Tone> = {
  active: "emerald",
  inactive: "slate",
  suspended: "red",
};

export const ROOM_STATUS_TONE: Record<string, Tone> = {
  available: "emerald",
  occupied: "blue",
  dirty: "amber",
  cleaning: "cyan",
  maintenance: "amber",
  out_of_order: "red",
};

export const HEALTH_TONE: Record<string, Tone> = {
  healthy: "emerald",
  warning: "amber",
  error: "red",
};
