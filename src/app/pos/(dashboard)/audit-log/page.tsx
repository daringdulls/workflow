"use client";

import { useEffect, useState } from "react";
import { AuditLogEntry } from "@/lib/pos/types";

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    fetch("/api/pos/audit-log")
      .then((r) => r.json())
      .then(setEntries);
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Audit Log</h1>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-2.5">Time</th>
              <th className="px-4 py-2.5">Staff</th>
              <th className="px-4 py-2.5">Action</th>
              <th className="px-4 py-2.5">Entity</th>
              <th className="px-4 py-2.5">Reason</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-slate-50 dark:border-slate-800/60 align-top">
                <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{e.staff_name ?? "System"}</td>
                <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{e.action.replace(/_/g, " ")}</td>
                <td className="px-4 py-2.5 text-slate-400">
                  {e.entity_type} {e.entity_id ? `#${e.entity_id}` : ""}
                </td>
                <td className="px-4 py-2.5 text-slate-400">{e.reason ?? "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
