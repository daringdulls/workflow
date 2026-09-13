import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser } from "@/lib/current-user";
import { getActivePropertyId } from "@/lib/active-property";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/database.types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const activePropertyId = user ? getActivePropertyId(user.properties) : null;

  let notifications: Notification[] = [];
  if (user) {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    notifications = data ?? [];
  }

  return (
    <AppShell
      profile={user?.profile ?? null}
      properties={user?.properties ?? []}
      activePropertyId={activePropertyId}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
