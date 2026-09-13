import { Bell, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo, titleCase } from "@/lib/format";
import { markNotification, markAllRead } from "./actions";
import clsx from "clsx";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const { data: notifications } = user
    ? await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100)
    : { data: [] };

  const unreadCount = (notifications ?? []).filter((n) => n.status === "unread").length;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Notifications"
        description="Bookings, payments, follow-ups and sync alerts relevant to you."
        actions={
          unreadCount > 0 && user ? (
            <form action={markAllRead.bind(null, user.id)}>
              <button type="submit" className="btn-secondary">
                Mark all as read
              </button>
            </form>
          ) : undefined
        }
      />
      {!notifications || notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="New bookings, payments and sync alerts will show up here." />
      ) : (
        <div className="card divide-y divide-slate-100">
          {notifications.map((n) => (
            <div key={n.id} className={clsx("flex items-start justify-between gap-3 px-4 py-3", n.status === "unread" && "bg-surface-alt/50")}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{titleCase(n.type)}</p>
                <p className="text-sm font-medium text-navy-900">{n.title}</p>
                {n.message && <p className="text-sm text-slate-500">{n.message}</p>}
                <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.created_at)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {n.status === "unread" && (
                  <form action={markNotification.bind(null, n.id, "read")}>
                    <button type="submit" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy-900" title="Mark as read">
                      <Check className="h-4 w-4" />
                    </button>
                  </form>
                )}
                {n.status !== "dismissed" && (
                  <form action={markNotification.bind(null, n.id, "dismissed")}>
                    <button type="submit" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy-900" title="Dismiss">
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
