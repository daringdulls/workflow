import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, expectedSessionToken, isValidPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (typeof password !== "string" || !(await isValidPassword(password))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await expectedSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
