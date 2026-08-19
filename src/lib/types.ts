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

export interface DesignOrder {
  id: number;
  order_name: string;
  order_type: string;
  design_type: string; // Logo / Jersey / Uniform
  client_name: string;
  contact: string | null; // phone number or WhatsApp group link
  sponsor: string | null;
  sponsor_logo_url: string | null;
  description: string | null; // "Other relevant information"
  logo_url: string | null;
  priority: Priority;
  status: DesignStatus;
  requested_date: string | null;
  due_date: string | null; // delivery date
  needs_shorts: boolean;
  needs_tracksuit: boolean;
  needs_skirt: boolean;
  number_front: string | null;
  number_back: string | null;
  number_shorts: string | null;
  neck_type: string | null;
  sleeve_type: string | null;
  reference_notes: string | null; // "ideal design" / reference & inspiration notes
  created_at: string;
}

// Auto order number shown to staff/clients — derived from the row id so no
// extra column or counter is needed.
export function formatOrderNumber(id: number) {
  return `WF-${String(id).padStart(5, "0")}`;
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
}

export const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};
