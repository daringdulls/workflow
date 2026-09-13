/**
 * Pixel Core — first-run seed script (development / initial setup only).
 *
 * Creates the initial organization, its properties, and the first Company
 * Admin user so you have something to log in with. Safe to re-run — it
 * skips anything that already exists. Business data (guests, bookings,
 * leads…) is intentionally NOT seeded here; that comes from real use or
 * from connecting Pixel Booking Manager.
 *
 * Usage:
 *   npm run seed -- --email you@example.com --password "SomeStrongPass123!"
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
function arg(name: string, fallback?: string) {
  const i = args.indexOf(`--${name}`);
  if (i !== -1 && args[i + 1]) return args[i + 1];
  return fallback;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your environment (.env.local).");
  process.exit(1);
}

const adminEmail = arg("email");
const adminPassword = arg("password");

if (!adminEmail || !adminPassword) {
  console.error('Usage: npm run seed -- --email you@example.com --password "SomeStrongPass123!"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const ORG_NAME = "Cozy Hotels Maldives";
const ORG_SLUG = "cozy-hotels-maldives";

const PROPERTIES = [
  { name: "Cozy Roots Fuvahmulah", code: "CRF", city: "Fuvahmulah" },
  { name: "Cozy Nest Fuvahmulah", code: "CNF", city: "Fuvahmulah" },
  { name: "Cozy Arts Dhangethi", code: "CAD", city: "Dhangethi" },
  { name: "Cozy Scuba Club Fuvahmulah", code: "CSC", city: "Fuvahmulah" },
  { name: "Cozy Deck", code: "CDK", city: "Fuvahmulah" },
];

async function main() {
  console.log(`Seeding organization "${ORG_NAME}"…`);

  let { data: org } = await supabase.from("organizations").select("*").eq("slug", ORG_SLUG).maybeSingle();
  if (!org) {
    const { data, error } = await supabase.from("organizations").insert({ name: ORG_NAME, slug: ORG_SLUG }).select().single();
    if (error) throw error;
    org = data;
    console.log(`Created organization ${org.id}`);
  } else {
    console.log(`Organization already exists (${org.id})`);
  }

  const propertyIds: string[] = [];
  for (const p of PROPERTIES) {
    const { data: existing } = await supabase.from("properties").select("id").eq("organization_id", org.id).eq("code", p.code).maybeSingle();
    if (existing) {
      propertyIds.push(existing.id);
      console.log(`Property ${p.name} already exists`);
      continue;
    }
    const { data, error } = await supabase
      .from("properties")
      .insert({ organization_id: org.id, name: p.name, code: p.code, city: p.city, country: "Maldives", currency: "USD" })
      .select("id")
      .single();
    if (error) throw error;
    propertyIds.push(data.id);
    console.log(`Created property ${p.name}`);
  }

  console.log(`Creating admin user ${adminEmail}…`);
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  let userId = existingUsers?.users.find((u) => u.email?.toLowerCase() === adminEmail!.toLowerCase())?.id;

  if (!userId) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { first_name: "Company", last_name: "Admin" },
    });
    if (error) throw error;
    userId = created.user!.id;
    console.log(`Created auth user ${userId}`);
  } else {
    console.log(`Auth user already exists (${userId})`);
  }

  // The `handle_new_auth_user` trigger creates the profile row automatically;
  // this just promotes it to Company Admin and assigns the organization.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ organization_id: org.id, is_org_admin: true, first_name: "Company", last_name: "Admin", status: "active" })
    .eq("id", userId);
  if (profileError) throw profileError;

  await supabase.from("user_property_access").delete().eq("user_id", userId);
  await supabase.from("user_property_access").insert(propertyIds.map((property_id) => ({ user_id: userId!, property_id })));

  console.log("\nDone! Sign in with:");
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
