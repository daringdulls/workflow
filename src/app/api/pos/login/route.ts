import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePosSchema, getDefaultOutletId } from "@/lib/pos/db";
import { verifyPin, signSession, POS_SESSION_COOKIE } from "@/lib/pos/auth";
import type { StaffRole } from "@/lib/pos/types";

// GET returns the tappable staff roster (name + role only, never the PIN
// hash) for the login screen — same pattern as a physical POS terminal that
// shows staff avatars to tap before entering a PIN.
export async function GET() {
  await ensurePosSchema();
  const outletId = await getDefaultOutletId();
  const rows = await sql`
    SELECT id, name, role FROM pos_staff
    WHERE outlet_id = ${outletId} AND active = true
    ORDER BY name;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await ensurePosSchema();
  const { staffId, pin } = await req.json();
  if (!staffId || !pin) {
    return NextResponse.json({ error: "staffId and pin are required" }, { status: 400 });
  }

  const rows = await sql`SELECT * FROM pos_staff WHERE id = ${staffId} AND active = true LIMIT 1;`;
  const staff = rows[0];
  if (!staff || !(await verifyPin(String(pin), staff.pin_hash as string))) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const token = await signSession({
    staffId: staff.id as number,
    outletId: staff.outlet_id as number,
    name: staff.name as string,
    role: staff.role as StaffRole,
  });

  const res = NextResponse.json({ id: staff.id, name: staff.name, role: staff.role });
  res.cookies.set(POS_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 14, // 14h — a long dining shift
  });
  return res;
}
