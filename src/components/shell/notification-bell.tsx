"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import clsx from "clsx";
import { timeAgo } from "@/lib/format";
import type { Notification } from "@/lib/database.types";

export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => n.status === "unread").length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-navy-900"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-slate-100 bg-white p-1.5 shadow-card-hover">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-sm font-semibold text-navy-900">Notifications</p>
              <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-medium text-brand-600 hover:underline">
                View all
              </Link>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-400">You&apos;re all caught up.</p>
              ) : (
                notifications.slice(0, 6).map((n) => (
                  <div key={n.id} className={clsx("rounded-lg px-3 py-2", n.status === "unread" && "bg-surface-alt/60")}>
                    <p className="text-sm font-medium text-navy-900">{n.title}</p>
                    {n.message && <p className="line-clamp-2 text-xs text-slate-500">{n.message}</p>}
                    <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
