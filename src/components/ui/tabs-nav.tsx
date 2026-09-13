import Link from "next/link";
import clsx from "clsx";

export function TabsNav({
  base,
  active,
  tabs,
}: {
  base: string;
  active: string;
  tabs: { key: string; label: string }[];
}) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-100">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`${base}?tab=${tab.key}`}
          className={clsx(
            "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
            active === tab.key
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-navy-900"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
