import { Priority, PRIORITY_LABEL } from "@/lib/types";

const COLORS: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${COLORS[priority]}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
