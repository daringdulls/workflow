import { ArrowDown } from "lucide-react";
import clsx from "clsx";
import { APP_CONNECTION_TONE, toneClass, type Tone } from "@/lib/status-styles";
import type { AppConnection } from "@/lib/database.types";

const DOT_TONE: Record<Tone, string> = {
  slate: "bg-slate-300",
  blue: "bg-blue-500",
  emerald: "bg-success-500",
  amber: "bg-warning-500",
  red: "bg-danger-500",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
};

const TARGETS: { key: string; name: string; fields: string[] }[] = [
  { key: "pms", name: "PMS", fields: ["Guest", "Stay", "Room", "Meal Plan", "Status"] },
  { key: "availability", name: "Availability", fields: ["Property", "Room Type", "Dates", "Inventory"] },
  { key: "restaurant", name: "Restaurant", fields: ["Guest", "Room", "Meal Plan"] },
  { key: "diving", name: "Diving", fields: ["Guest", "Package", "Dates"] },
  { key: "pos", name: "POS", fields: ["Guest", "Charges", "Balance"] },
  { key: "reputation", name: "Reputation", fields: ["Guest", "Property", "Checkout Date", "Contact"] },
  { key: "b2b", name: "B2B", fields: ["Rates", "Offers", "Availability"] },
  { key: "sales_b2c", name: "Sales / B2C", fields: ["Inquiries", "Quotes", "Bookings"] },
];

export function DataFlow({ apps }: { apps: AppConnection[] }) {
  const statusFor = (key: string) => apps.find((a) => a.app_key === key)?.status ?? "coming_soon";

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className={clsx("badge", toneClass(APP_CONNECTION_TONE[statusFor("booking_manager")] ?? "slate"))}>
          Pixel Booking Manager
        </div>
        <ArrowDown className="h-4 w-4 text-slate-300" />
        <div className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white shadow-card">Pixel Core</div>
        <ArrowDown className="h-4 w-4 text-slate-300" />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TARGETS.map((target) => {
          const status = statusFor(target.key);
          const tone = APP_CONNECTION_TONE[status] ?? "slate";
          return (
            <div key={target.key} className="rounded-xl border border-slate-100 bg-surface-alt/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-1">
                <p className="text-xs font-semibold text-navy-900">{target.name}</p>
                <span className={clsx("h-1.5 w-1.5 rounded-full", DOT_TONE[tone])} />
              </div>
              <ul className="space-y-0.5">
                {target.fields.map((field) => (
                  <li key={field} className="text-[11px] text-slate-500">
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
