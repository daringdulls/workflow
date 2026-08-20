import { Profile } from "@/lib/types";

export const PROFILE_META: Record<
  Profile | "all",
  {
    label: string;
    accent: string; // solid brand color, e.g. text-hotel
    accentBg: string; // solid bg, e.g. bg-hotel
    tintBg: string; // pale tint background for active nav row (dark sidebar only)
    tintText: string; // darker tint text for active nav row (dark sidebar only)
    ring: string;
    chipBg: string; // pale tint background for badges/pills on a LIGHT surface
    chipText: string; // readable text color for badges/pills on a LIGHT surface
    chipDarkBg: string; // pale tint background for badges/pills on a DARK surface
    chipDarkText: string; // readable text color for badges/pills on a DARK surface
  }
> = {
  all: {
    label: "All Work",
    accent: "text-slate-300",
    accentBg: "bg-slate-700",
    tintBg: "bg-slate-100",
    tintText: "text-slate-800",
    ring: "ring-white/20",
    chipBg: "bg-slate-100",
    chipText: "text-slate-700",
    chipDarkBg: "dark:bg-white/10",
    chipDarkText: "dark:text-slate-200",
  },
  hotel: {
    label: "Hotel Ops",
    accent: "text-hotel-400",
    accentBg: "bg-hotel",
    tintBg: "bg-hotel-50",
    tintText: "text-hotel-700",
    ring: "ring-hotel/30",
    chipBg: "bg-hotel-50",
    chipText: "text-hotel-700",
    chipDarkBg: "dark:bg-hotel/15",
    chipDarkText: "dark:text-hotel-400",
  },
  design: {
    label: "Graphic Design",
    accent: "text-design-400",
    accentBg: "bg-design",
    tintBg: "bg-design-50",
    tintText: "text-design-700",
    ring: "ring-design/30",
    chipBg: "bg-design-50",
    chipText: "text-design-700",
    chipDarkBg: "dark:bg-design/15",
    chipDarkText: "dark:text-design-400",
  },
  freelance: {
    label: "Freelance",
    accent: "text-freelance-400",
    accentBg: "bg-freelance",
    tintBg: "bg-freelance-50",
    tintText: "text-freelance-700",
    ring: "ring-freelance/30",
    chipBg: "bg-freelance-50",
    chipText: "text-freelance-700",
    chipDarkBg: "dark:bg-freelance/15",
    chipDarkText: "dark:text-freelance-400",
  },
  general: {
    label: "General",
    accent: "text-slate-300",
    accentBg: "bg-slate-500",
    tintBg: "bg-slate-100",
    tintText: "text-slate-800",
    ring: "ring-white/20",
    chipBg: "bg-slate-100",
    chipText: "text-slate-700",
    chipDarkBg: "dark:bg-white/10",
    chipDarkText: "dark:text-slate-200",
  },
};

function ProfileIcon({ profile, className }: { profile: Profile | "all"; className?: string }) {
  switch (profile) {
    case "all":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "hotel":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M3 21V9.5L12 3l9 6.5V21" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "design":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.7 1.5-1.4 0-.5-.3-.9-.3-1.4 0-.8.6-1.2 1.4-1.2H16a5 5 0 0 0 5-5c0-5-4.5-9-9-9Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
          <circle cx="10.5" cy="7.5" r="1.2" fill="currentColor" />
          <circle cx="15" cy="8" r="1.2" fill="currentColor" />
        </svg>
      );
    case "freelance":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 12h18" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
  }
}

export default function ProfileTabs({
  active,
  onChange,
}: {
  active: Profile | "all";
  onChange: (p: Profile | "all") => void;
}) {
  const tabs: (Profile | "all")[] = ["all", "hotel", "design", "freelance"];
  return (
    <nav className="flex flex-col gap-1">
      {tabs.map((t) => {
        const meta = PROFILE_META[t];
        const isActive = active === t;
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? `${meta.tintBg} ${meta.tintText}`
                : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-800"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isActive ? meta.accentBg : "bg-slate-100 group-hover:bg-white"
              }`}
            >
              <ProfileIcon profile={t} className={`h-[18px] w-[18px] ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"}`} />
            </span>
            {meta.label}
          </button>
        );
      })}
    </nav>
  );
}
