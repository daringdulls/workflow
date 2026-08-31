"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABEL, StaffRole } from "@/lib/pos/types";

interface RosterEntry {
  id: number;
  name: string;
  role: StaffRole;
}

export default function PosLoginPage() {
  const router = useRouter();
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [selected, setSelected] = useState<RosterEntry | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/pos/login")
      .then((r) => r.json())
      .then(setRoster)
      .catch(() => setRoster([]));
  }, []);

  function pressDigit(d: string) {
    setError("");
    setPin((p) => (p.length >= 6 ? p : p + d));
  }

  async function submit() {
    if (!selected || pin.length < 4) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pos/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selected.id, pin }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Invalid PIN");
      }
      router.push("/pos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (pin.length >= 4 && selected) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  if (!selected) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-10">
        <div className="text-center mb-8">
          <p className="text-white text-2xl font-semibold">Restaurant POS</p>
          <p className="text-slate-400 text-sm mt-1">Tap your name to sign in</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl w-full">
          {roster.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelected(s);
                setPin("");
                setError("");
              }}
              className="flex flex-col items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl px-4 py-6 transition"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white font-semibold text-lg">
                {s.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-white text-sm font-medium">{s.name}</span>
              <span className="text-slate-500 text-xs">{ROLE_LABEL[s.role]}</span>
            </button>
          ))}
          {roster.length === 0 && (
            <p className="col-span-full text-slate-500 text-sm text-center">No staff configured yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-10">
      <button onClick={() => setSelected(null)} className="text-slate-400 text-sm mb-6 hover:text-white">
        ← Not {selected.name}?
      </button>
      <div className="flex flex-col items-center gap-2 mb-8">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white font-semibold text-xl">
          {selected.name.slice(0, 2).toUpperCase()}
        </span>
        <p className="text-white font-semibold">{selected.name}</p>
        <p className="text-slate-500 text-xs">{ROLE_LABEL[selected.role]}</p>
      </div>

      <div className="flex gap-3 mb-6">
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border border-slate-600 ${i < pin.length ? "bg-orange-500 border-orange-500" : ""}`}
          />
        ))}
      </div>

      {error && <p className="text-rose-400 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-3 w-64">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            disabled={busy}
            onClick={() => pressDigit(d)}
            className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xl font-medium border border-slate-800 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => setPin("")}
          className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-sm font-medium border border-slate-800"
        >
          Clear
        </button>
        <button
          disabled={busy}
          onClick={() => pressDigit("0")}
          className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xl font-medium border border-slate-800 disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={() => setPin((p) => p.slice(0, -1))}
          className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-sm font-medium border border-slate-800"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
