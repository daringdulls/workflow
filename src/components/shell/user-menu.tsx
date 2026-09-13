"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { initials, titleCase } from "@/lib/format";
import { logout } from "@/app/login/actions";

export function UserMenu({
  firstName,
  lastName,
  email,
  roleLabel,
}: {
  firstName: string;
  lastName: string;
  email: string;
  roleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const name = `${firstName} ${lastName}`.trim() || email;

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {initials(firstName, lastName)}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium leading-tight text-navy-900">{name}</p>
          <p className="text-xs leading-tight text-slate-500">{titleCase(roleLabel || "member")}</p>
        </div>
        <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-slate-100 bg-white p-1.5 shadow-card-hover">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-navy-900">{name}</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
            <div className="my-1 h-px bg-slate-100" />
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-surface-alt"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger-600 hover:bg-danger-50"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
