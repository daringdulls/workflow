import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getPosSession, hasPermission, PosSession, verifyPin } from "./auth";
import type { RolePermissions, StaffRole } from "./types";

// Shared guard for /api/pos/* route handlers: resolves the signed-in staff
// member (middleware already blocks anonymous requests, this just recovers
// the session payload) and optionally checks a coarse role permission.
// Returns either the session or a ready-to-return 401/403 NextResponse.
export async function requireSession(
  permission?: keyof RolePermissions
): Promise<{ session: PosSession } | { error: NextResponse }> {
  const session = await getPosSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (permission && !hasPermission(session.role, permission)) {
    return { error: NextResponse.json({ error: "Forbidden — insufficient role permissions" }, { status: 403 }) };
  }
  return { session };
}

// Large discounts, voids, refunds, and comps need a second set of eyes.
// The acting staff member (who may lack the permission themselves — e.g. a
// waiter requesting a void) supplies a manager's staffId + PIN; this checks
// that staff member is active, in the same outlet, and actually holds the
// required permission. Used to authorize an action beyond the requester's
// own role rather than to re-authenticate the session.
export async function verifyManagerAuth(
  outletId: number,
  approverStaffId: number | undefined,
  pin: string | undefined,
  permission: keyof RolePermissions
): Promise<{ ok: true; approverName: string } | { ok: false; error: NextResponse }> {
  if (!approverStaffId || !pin) {
    return { ok: false, error: NextResponse.json({ error: "Manager authorization (staff + PIN) is required" }, { status: 403 }) };
  }
  const rows = await sql`
    SELECT * FROM pos_staff WHERE id = ${approverStaffId} AND outlet_id = ${outletId} AND active = true LIMIT 1;
  `;
  const approver = rows[0];
  if (!approver || !(await verifyPin(pin, approver.pin_hash as string))) {
    return { ok: false, error: NextResponse.json({ error: "Invalid manager PIN" }, { status: 403 }) };
  }
  if (!hasPermission(approver.role as StaffRole, permission)) {
    return { ok: false, error: NextResponse.json({ error: `${approver.name} does not have authorization for this action` }, { status: 403 }) };
  }
  return { ok: true, approverName: approver.name as string };
}

export async function logAudit(params: {
  outletId: number;
  staffId: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}) {
  await sql`
    INSERT INTO pos_audit_log (outlet_id, staff_id, action, entity_type, entity_id, old_value, new_value, reason)
    VALUES (
      ${params.outletId},
      ${params.staffId},
      ${params.action},
      ${params.entityType},
      ${params.entityId ?? null},
      ${params.oldValue ? JSON.stringify(params.oldValue) : null},
      ${params.newValue ? JSON.stringify(params.newValue) : null},
      ${params.reason ?? null}
    );
  `;
}
