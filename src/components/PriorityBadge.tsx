import { Priority, PRIORITY_LABEL } from "@/lib/types";

// Status colors (reserved, never reused for series/profile identity), each
// always paired with a dot + label so priority is never color-alone.
const COLORS: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

const DOT: Record<Priority, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${COLORS[priority]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[priority]}`} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
