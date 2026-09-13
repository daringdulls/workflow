"use client";

import { Menu } from "lucide-react";
import { GlobalSearch } from "./global-search";
import { PropertySelector } from "./property-selector";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import type { Notification, Profile, Property } from "@/lib/database.types";

export function Topbar({
  onOpenMobile,
  profile,
  properties,
  activePropertyId,
  notifications,
}: {
  onOpenMobile: () => void;
  profile: Profile | null;
  properties: Property[];
  activePropertyId: string | null;
  notifications: Notification[];
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-100 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onOpenMobile}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden min-w-0 flex-1 md:block">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        <div className="hidden sm:block">
          <PropertySelector properties={properties} activePropertyId={activePropertyId} />
        </div>
        <NotificationBell notifications={notifications} />
        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
        <UserMenu
          firstName={profile?.first_name ?? ""}
          lastName={profile?.last_name ?? ""}
          email={profile?.email ?? ""}
          roleLabel={profile?.is_org_admin ? "Company Admin" : "Team Member"}
        />
      </div>
    </header>
  );
}
