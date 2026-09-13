import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-brand-600">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium text-navy-900">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="btn-primary mt-2">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
