import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql, ensureSchema } from "@/lib/db";

// Intentionally NOT behind the password gate (see src/middleware.ts) — this
// is the intake form design staff use to submit a new request without a
// login. It only ever INSERTs a new row; it can't read, edit, or delete
// anything else in the workspace. (The order-tracking GET endpoint lives
// alongside it at /api/public/track — also public, read-only.)

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]);

async function uploadImage(file: File, folder: string, label: string) {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`${label} file is too large (max 8MB).`);
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`${label} must be an image file (PNG, JPG, WEBP, SVG, or GIF).`);
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(`${folder}/${Date.now()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}

export async function POST(req: NextRequest) {
  await ensureSchema();

  const form = await req.formData();

  const order_name = String(form.get("order_name") ?? "").trim();
  const order_type = String(form.get("order_type") ?? "").trim();
  const design_type = String(form.get("design_type") ?? "").trim();
  const client_name = String(form.get("client_name") ?? "").trim();
  const contact = String(form.get("contact") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const priority = String(form.get("priority") ?? "medium").trim();
  const requested_date = String(form.get("requested_date") ?? "").trim();
  const due_date = String(form.get("due_date") ?? "").trim();
  const needs_shorts = String(form.get("needs_shorts") ?? "") === "true";
  const needs_tracksuit = String(form.get("needs_tracksuit") ?? "") === "true";
  const needs_skirt = String(form.get("needs_skirt") ?? "") === "true";
  const needs_numbering = String(form.get("needs_numbering") ?? "") === "true";
  const number_front = String(form.get("number_front") ?? "").trim();
  const number_back = String(form.get("number_back") ?? "").trim();
  const number_shorts = String(form.get("number_shorts") ?? "").trim();
  const neck_type = String(form.get("neck_type") ?? "").trim();
  const sleeve_types = form.getAll("sleeve_types").map((v) => String(v)).filter(Boolean);
  const role_player = String(form.get("role_player") ?? "") === "true";
  const role_keeper = String(form.get("role_keeper") ?? "") === "true";
  const role_libero = String(form.get("role_libero") ?? "") === "true";
  const role_official = String(form.get("role_official") ?? "") === "true";
  const reference_notes = String(form.get("reference_notes") ?? "").trim();
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
  if (design_type === "Jersey" && !(role_player || role_keeper || role_libero || role_official)) {
    return NextResponse.json(
      { error: "Jersey orders need at least one type selected: Player, Keeper, Libero, or Official." },
      { status: 400 }
    );
  }

  let logo_url: string | null = null;
  const sponsors: { name: string; logo_url: string | null }[] = [];
  try {
    if (logo instanceof File && logo.size > 0) {
      logo_url = await uploadImage(logo, "design-logos", "Logo");
    }

    const sponsorCount = Number(form.get("sponsors_count") ?? 0) || 0;
    for (let i = 0; i < sponsorCount; i++) {
      const name = String(form.get(`sponsor_name_${i}`) ?? "").trim();
      const file = form.get(`sponsor_logo_${i}`);
      let sponsorLogoUrl: string | null = null;
      if (file instanceof File && file.size > 0) {
        sponsorLogoUrl = await uploadImage(file, "sponsor-logos", "Sponsor logo");
      }
      if (name || sponsorLogoUrl) {
        sponsors.push({ name, logo_url: sponsorLogoUrl });
      }
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed." }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO design_orders
      (order_name, order_type, design_type, client_name, contact, sponsors,
       description, logo_url, priority, status, requested_date, due_date,
       needs_shorts, needs_tracksuit, needs_skirt, needs_numbering,
       number_front, number_back, number_shorts,
       neck_type, sleeve_types, role_player, role_keeper, role_libero, role_official, reference_notes)
    VALUES
      (${order_name}, ${order_type}, ${design_type || "Jersey"}, ${client_name}, ${contact || null},
       ${JSON.stringify(sponsors)}, ${description || null}, ${logo_url}, ${priority}, 'new',
       ${requested_date || null}, ${due_date || null}, ${needs_shorts}, ${needs_tracksuit}, ${needs_skirt},
       ${needs_numbering}, ${number_front || null}, ${number_back || null}, ${number_shorts || null},
       ${neck_type || null}, ${sleeve_types}, ${role_player}, ${role_keeper}, ${role_libero}, ${role_official},
       ${reference_notes || null})
    RETURNING id;
  `;

  return NextResponse.json({ ok: true, id: rows[0].id }, { status: 201 });
}
