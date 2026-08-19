import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { parseOrderNumber } from "@/lib/types";

// Public, read-only order-status lookup for the "Track your request" tab on
// /request. Deliberately returns only the fields someone tracking an order
// would need (name, type, status, dates) — not contact info, sponsors,
// internal notes, or anything else in the workspace.

// Reads a query param per-request, so this must never be statically
// prerendered at build time (when there's no DB connection string yet).
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const raw = req.nextUrl.searchParams.get("order") ?? "";
  const id = parseOrderNumber(raw);
  if (!id) {
    return NextResponse.json({ error: "Enter a valid order number, e.g. WF-00042." }, { status: 400 });
  }

  const rows = await sql`
    SELECT id, order_name, order_type, design_type, client_name, status, priority,
           requested_date, due_date, logo_url, created_at
    FROM design_orders WHERE id = ${id};
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "No request found with that order number." }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}
