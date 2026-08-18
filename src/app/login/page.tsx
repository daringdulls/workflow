"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(params.get("next") || "/");
      router.refresh();
    } else {
      setError("Incorrect password. Try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-hotel/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-design/20 blur-3xl" />
      <div className="absolute top-1/2 right-1/3 h-56 w-56 rounded-full bg-freelance/10 blur-3xl" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-hotel via-design to-freelance text-white font-bold shadow-card mb-4">
          W
        </span>
        <h1 className="text-xl font-semibold text-white mb-1">WorkFlow</h1>
        <p className="text-sm text-slate-400 mb-6">
          Pixelate MV · your work dashboard
        </p>
        <label className="block text-sm text-slate-300 mb-2" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-hotel-400"
        />
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-hotel to-hotel-700 hover:opacity-90 disabled:opacity-60 text-white font-medium py-2 transition"
        >
          {loading ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
