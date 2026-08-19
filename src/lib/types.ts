export type Profile = "hotel" | "design" | "freelance" | "general";

export type Priority = "low" | "medium" | "high" | "urgent";

export type TaskStatus = "todo" | "in_progress" | "done";

export type DesignStatus = "new" | "in_progress" | "review" | "delivered";

export type FreelanceStatus = "lead" | "active" | "review" | "delivered" | "paid";

export interface Task {
  id: number;
  profile: Profile;
  title: string;
  notes: string | null;
  due_date: string | null; // ISO date
  priority: Priority;
  status: TaskStatus;
  remind_at: string | null; // ISO timestamp — browser notification fires at/after this instant
  created_at: string;
}

export interface AppLink {
  id: number;
  profile: Profile;
  label: string;
  url: string;
  emoji: string;
  sort_order: number;
}

// Sportswear / sublimation-printing order types, replacing the old generic
// print-shop list now that this pipeline is used for jersey & uniform orders.
export const ORDER_TYPES = [
  "Uniform",
  "Volleyball Jersey",
  "Football Jersey",
  "Basketball Jersey",
  "Cricket Jersey",
  "Event T-Shirt",
  "Team Tracksuit",
  "Corporate Uniform",
  "Other",
] as const;

export const DESIGN_TYPES = ["Logo", "Jersey", "Uniform"] as const;

export const NECK_TYPES = ["Round Neck", "V-Neck", "Collar (Polo)", "Henley", "Other"] as const;

export const SLEEVE_TYPES = ["Short Sleeve", "Long Sleeve", "Sleeveless", "Raglan Sleeve", "Other"] as const;

// Required, jersey-specific "who is this jersey for" roles — only shown /
// required when Design Type = "Jersey".
export const JERSEY_ROLES = ["Player", "Keeper", "Libero", "Official"] as const;
export type JerseyRole = (typeof JERSEY_ROLES)[number];

export interface DesignSponsor {
  name: string;
  logo_url: string | null;
}

export interface DesignOrder {
  id: number;
  order_name: string;
  order_type: string;
  design_type: string; // Logo / Jersey / Uniform
  client_name: string;
  contact: string | null; // phone number or WhatsApp group link
  sponsor: string | null; // deprecated single-sponsor fields, kept for old rows
  sponsor_logo_url: string | null;
  sponsors: DesignSponsor[]; // current multi-sponsor list
  description: string | null; // "Other relevant information"
  logo_url: string | null;
  priority: Priority;
  status: DesignStatus;
  requested_date: string | null;
  due_date: string | null; // delivery date
  needs_shorts: boolean;
  needs_tracksuit: boolean;
  needs_skirt: boolean;
  needs_numbering: boolean;
  number_front: string | null;
  number_back: string | null;
  number_shorts: string | null;
  neck_type: string | null;
  sleeve_type: string | null; // deprecated single value, kept for old rows
  sleeve_types: string[]; // current multi-select sleeve types
  role_player: boolean;
  role_keeper: boolean;
  role_libero: boolean;
  role_official: boolean;
  reference_notes: string | null; // "ideal design" / reference & inspiration notes
  created_at: string;
}

// Auto order number shown to staff/clients — derived from the row id so no
// extra column or counter is needed.
export function formatOrderNumber(id: number) {
  return `WF-${String(id).padStart(5, "0")}`;
}

// Parses an order number like "WF-00042" (or a bare "42") back to the row id.
export function parseOrderNumber(input: string): number | null {
  const trimmed = input.trim();
  const match = trimmed.match(/(\d+)\s*$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function jerseyRolesOf(o: Pick<DesignOrder, "role_player" | "role_keeper" | "role_libero" | "role_official">) {
  const roles: JerseyRole[] = [];
  if (o.role_player) roles.push("Player");
  if (o.role_keeper) roles.push("Keeper");
  if (o.role_libero) roles.push("Libero");
  if (o.role_official) roles.push("Official");
  return roles;
}

export interface FreelanceProject {
  id: number;
  client_name: string;
  project_name: string;
  description: string | null;
  priority: Priority;
  status: FreelanceStatus;
  deadline: string | null;
  rate: string | null;
  created_at: string;
}

export interface CalEvent {
  id: number;
  profile: Profile;
  title: string;
  date: string; // ISO date
  time: string | null; // HH:MM
  notes: string | null;
  remind_at: string | null; // ISO timestamp — browser notification fires at/after this instant
}

// Preset offsets shown in the calendar's "remind me" picker.
export const REMINDER_OFFSETS: { value: number; label: string }[] = [
  { value: 0, label: "At time of event" },
  { value: 15, label: "15 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 24 * 60, label: "1 day before" },
];

export const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};
