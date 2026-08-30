import { redirect } from "next/navigation";
import Link from "next/link";
import { getPosSession, permissionsFor } from "@/lib/pos/auth";
import { sql } from "@/lib/db";
import { ensurePosSchema } from "@/lib/pos/db";
import { ROLE_LABEL } from "@/lib/pos/types";
import LogoutButton from "@/components/pos/LogoutButton";

const NAV = [
  { href: "/pos/dashboard", label: "Dashboard", icon: "📊", perm: "reports" as const },
  { href: "/pos/order", label: "POS / Order", icon: "🧾", perm: "pos" as const },
  { href: "/pos/tables", label: "Tables", icon: "🍽️", perm: "tables" as const },
  { href: "/pos/kitchen", label: "Kitchen (KDS)", icon: "👨‍🍳", perm: "kitchen" as const },
  { href: "/pos/menu", label: "Menu", icon: "📋", perm: "menu" as const },
  { href: "/pos/customers", label: "Customers", icon: "👤", perm: "customers" as const },
  { href: "/pos/reservations", label: "Reservations", icon: "📅", perm: "reservations" as const },
  { href: "/pos/inventory", label: "Inventory", icon: "📦", perm: "inventory" as const },
  { href: "/pos/purchases", label: "Purchasing", icon: "🛒", perm: "purchasing" as const },
  { href: "/pos/expenses", label: "Expenses", icon: "💸", perm: "expenses" as const },
  { href: "/pos/shifts", label: "Shifts & Cash", icon: "🗄️", perm: "shifts" as const },
  { href: "/pos/reports", label: "Reports", icon: "📈", perm: "reports" as const },
  { href: "/pos/staff", label: "Staff", icon: "🧑‍🤝‍🧑", perm: "staff" as const },
  { href: "/pos/audit-log", label: "Audit Log", icon: "🕵️", perm: "settings" as const },
  { href: "/pos/settings", label: "Settings", icon: "⚙️", perm: "settings" as const },
];

export default async function PosDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getPosSession();
  if (!session) redirect("/pos/login");

  await ensurePosSchema();
  const outletRows = await sql`SELECT name, logo_url FROM pos_outlets WHERE id = ${session.outletId} LIMIT 1;`;
  const outlet = outletRows[0] as { name: string; logo_url: string | null } | undefined;
  const perms = permissionsFor(session.role);
  const items = NAV.filter((n) => perms[n.perm]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 lg:flex">
      <aside className="lg:w-60 lg:flex-shrink-0 bg-slate-900 lg:min-h-screen lg:sticky lg:top-0 lg:self-start border-r border-slate-800">
        <div className="flex flex-col h-full lg:h-screen px-3 py-4">
          <div className="flex items-center gap-2.5 px-2 mb-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white font-bold text-sm">
              🍴
            </span>
            <div className="min-w-0">
              <p className="text-white font-semibold leading-tight truncate">{outlet?.name ?? "Restaurant POS"}</p>
              <p className="text-[11px] text-slate-500 leading-tight">Restaurant POS</p>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white transition"
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-2 py-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white text-xs font-semibold">
                {session.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 font-medium truncate">{session.name}</p>
                <p className="text-[11px] text-slate-500">{ROLE_LABEL[session.role]}</p>
              </div>
            </div>
            <div className="px-2 pt-1">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
