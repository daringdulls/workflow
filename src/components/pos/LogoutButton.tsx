"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/pos/logout", { method: "POST" });
        router.push("/pos/login");
        router.refresh();
      }}
      className="text-sm text-slate-400 hover:text-white transition"
    >
      Sign out
    </button>
  );
}
