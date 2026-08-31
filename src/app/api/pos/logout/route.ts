import { NextResponse } from "next/server";
import { POS_SESSION_COOKIE } from "@/lib/pos/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(POS_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
