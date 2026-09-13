import type { KnowledgeCategory } from "@/lib/database.types";

export const KNOWLEDGE_CATEGORIES: { value: KnowledgeCategory; label: string }[] = [
  { value: "check_in_out", label: "Check-in / Check-out" },
  { value: "meal_times", label: "Meal Times" },
  { value: "airport_transfer", label: "Airport & Transfers" },
  { value: "room_info", label: "Room Information" },
  { value: "facilities", label: "Hotel Facilities" },
  { value: "diving", label: "Diving" },
  { value: "dive_requirements", label: "Dive Requirements" },
  { value: "cancellation_policy", label: "Cancellation Policy" },
  { value: "payment_policy", label: "Payment Policy" },
  { value: "children_policy", label: "Children Policy" },
  { value: "extra_bed_policy", label: "Extra Bed Policy" },
  { value: "restaurant_menu", label: "Restaurant Menu" },
  { value: "activities", label: "Activities" },
  { value: "bike_rental", label: "Bike Rental" },
  { value: "island_info", label: "Island Information" },
  { value: "emergency_info", label: "Emergency Information" },
  { value: "faq", label: "FAQ" },
  { value: "other", label: "Other" },
];

export function categoryLabel(category: string): string {
  return KNOWLEDGE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

/** e.g. "Cozy Scuba Club → Diving → Equipment for rental divers" */
export function sourceLabel(propertyName: string | null, category: string, title: string): string {
  return `${propertyName ?? "All Properties"} → ${categoryLabel(category)} → ${title}`;
}
