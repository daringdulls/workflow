import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, expectedSessionToken } from "@/lib/auth";
import { POS_SESSION_COOKIE, verifySessionToken } from "@/lib/pos/auth";

// Gate every page and API route behind a single shared password, since this
// dashboard holds your real work data and will be reachable on the public
// internet once deployed. /login and its API are always allowed through.
//
// /request and /api/public/* are also intentionally open: /request is the
// design-request intake form staff use without logging in, and its API can
// only INSERT a new design order — it has no read/update/delete access to
// anything else in the workspace.
//
// The restaurant POS module (/pos, /api/pos) is a separate application with
// its own staff roster and PIN-based session (pos_session), independent of
// the single shared WORKFLOW_PASSWORD above — waiters/cashiers/kitchen staff
// should never need the personal-dashboard password. /menu/* and
// /api/public/pos/* are the guest-facing QR ordering pages and are
// intentionally open (read-only menu + order submission only).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/request") ||
    pathname.startsWith("/api/public/") ||
    pathname.startsWith("/menu") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/pos") || pathname.startsWith("/api/pos")) {
    if (pathname === "/pos/login" || pathname === "/api/pos/login") {
      return NextResponse.next();
    }
    const token = req.cookies.get(POS_SESSION_COOKIE)?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/pos/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const expected = await expectedSessionToken();

  if (!cookie || cookie !== expected) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
