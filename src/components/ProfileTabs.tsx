import { Profile } from "@/lib/types";

export const PROFILE_META: Record<
  Profile | "all",
  { label: string; color: string; activeBg: string }
> = {
  all: { label: "All Work", color: "text-slate-700", activeBg: "bg-slate-900" },
  hotel: { label: "Hotel Ops", color: "text-blue-700", activeBg: "bg-blue-600" },
  design: { label: "Graphic Design", color: "text-purple-700", activeBg: "bg-purple-600" },
  freelance: { label: "Freelance", color: "text-teal-700", activeBg: "bg-teal-600" },
  general: { label: "General", color: "text-slate-700", activeBg: "bg-slate-700" },
};

export default function ProfileTabs({
  active,
  onChange,
}: {
  active: Profile | "all";
  onChange: (p: Profile | "all") => void;
}) {
  const tabs: (Profile | "all")[] = ["all", "hotel", "design", "freelance"];
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((t) => {
        const meta = PROFILE_META[t];
        const isActive = active === t;
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              isActive
                ? `${meta.activeBg} text-white shadow`
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
