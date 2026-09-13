export type RangeKey = "today" | "week" | "month" | "year" | "custom";

export function resolveDateRange(range: RangeKey | undefined, from?: string, to?: string) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  if (range === "custom" && from && to) {
    return { from, to, label: `${from} → ${to}` };
  }

  switch (range) {
    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { from: toISO(startOfDay(start)), to: toISO(now), label: "This Week" };
    }
    case "year": {
      return { from: `${now.getFullYear()}-01-01`, to: toISO(now), label: "This Year" };
    }
    case "month": {
      return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISO(now), label: "This Month" };
    }
    case "today":
    default:
      return { from: toISO(startOfDay(now)), to: toISO(now), label: "Today" };
  }
}

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];
