import Link from "next/link";
import { Building2, Hotel, Users, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";

const LINKS = [
  { href: "/organizations", label: "Organization", description: "Name, status and account-level settings.", icon: Building2 },
  { href: "/properties", label: "Properties", description: "Add, edit and deactivate properties.", icon: Hotel },
  { href: "/users", label: "Users", description: "Invite teammates and manage property access.", icon: Users },
  { href: "/roles", label: "Roles & Permissions", description: "Define what each role can see and do.", icon: ShieldCheck },
];

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <PageHeader title="System Settings" description="Everything about how your Pixel Core account is configured." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="card flex items-start gap-3 p-5 hover:shadow-card-hover">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-brand-600">
              <link.icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">{link.label}</p>
              <p className="text-xs text-slate-500">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
      {!user?.profile?.is_org_admin && (
        <p className="mt-4 text-xs text-slate-400">Some settings are read-only until a Company Admin grants you access.</p>
      )}
    </div>
  );
}
