import { toneClass, type Tone } from "@/lib/status-styles";
import { titleCase } from "@/lib/format";
import clsx from "clsx";

export function StatusBadge({
  status,
  tone,
  label,
  className,
}: {
  status: string;
  tone: Tone;
  label?: string;
  className?: string;
}) {
  return (
    <span className={clsx("badge", toneClass(tone), className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label ?? titleCase(status)}
    </span>
  );
}
