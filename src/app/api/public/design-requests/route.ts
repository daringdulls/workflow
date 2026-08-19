import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql, ensureSchema } from "@/lib/db";

// Intentionally NOT behind the password gate (see src/middleware.ts) — this
// is the intake form design staff use to submit a new request without a
// login. It only ever INSERTs a new row; it can't read, edit, or delete
// anything else in the workspace.

const MAX_LOGO_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]);

export async function POST(req: NextRequest) {
  await ensureSchema();

  const form = await req.formData();

  const order_name = String(form.get("order_name") ?? "").trim();
  const order_type = String(form.get("order_type") ?? "").trim();
  const client_name = String(form.get("client_name") ?? "").trim();
  const sponsor = String(form.get("sponsor") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const priority = String(form.get("priority") ?? "medium").trim();
  const requested_date = String(form.get("requested_date") ?? "").trim();
  const due_date = String(form.get("due_date") ?? "").trim();
  const logo = form.get("logo");

  if (!order_name || !order_type || !client_name) {
    return NextResponse.json(
      { error: "Order name, order type, and client/team name are required." },
      { status: 400 }
    );
  }
  if (!["low", "medium", "high", "urgent"].includes(priority)) {
    return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
  }

  let logo_url: string | null = null;
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > MAX_LOGO_BYTES) {
      return NextResponse.json({ error: "Logo file is too large (max 8MB)." }, { status: 400 });
    }
    if (!ALLOWED_LOGO_TYPES.has(logo.type)) {
      return NextResponse.json({ error: "Logo must be an image file (PNG, JPG, WEBP, SVG, or GIF)." }, { status: 400 });
    }
    const safeName = logo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`design-logos/${Date.now()}-${safeName}`, logo, {
      access: "public",
      addRandomSuffix: true,
    });
    logo_url = blob.url;
  }

  const rows = await sql`
    INSERT INTO design_orders
      (order_name, order_type, client_name, sponsor, description, logo_url, priority, status, requested_date, due_date)
    VALUES
      (${order_name}, ${order_type}, ${client_name}, ${sponsor || null}, ${description || null},
       ${logo_url}, ${priority}, 'new', ${requested_date || null}, ${due_date || null})
    RETURNING id;
  `;

  return NextResponse.json({ ok: true, id: rows[0].id }, { status: 201 });
}
