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

export const ORDER_TYPES = [
  "Business Cards",
  "Banner / Signage",
  "Apparel / Jersey",
  "Mug / Sublimation Item",
  "Packaging / Label",
  "Social Media Graphic",
  "Logo / Branding",
  "Other",
] as const;

export interface DesignOrder {
  id: number;
  order_name: string;
  order_type: string;
  client_name: string;
  sponsor: string | null;
  description: string | null; // "Other relevant information"
  logo_url: string | null;
  priority: Priority;
  status: DesignStatus;
  requested_date: string | null;
  due_date: string | null; // delivery date
  created_at: string;
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
