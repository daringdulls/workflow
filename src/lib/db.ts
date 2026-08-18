import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  "";

if (!connectionString) {
  // Thrown lazily (only when a query actually runs) so `next build` doesn't
  // fail just because env vars aren't set yet in this environment.
  console.warn(
    "No database connection string found. Set DATABASE_URL (or POSTGRES_URL) — see .env.example."
  );
}

export const sql = neon(connectionString);

let schemaReady = false;

// Idempotently creates every table the app needs. Safe to call on every
// request — after the first call it's a single cheap boolean check.
export async function ensureSchema() {
  if (schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS links (
      id SERIAL PRIMARY KEY,
      profile TEXT NOT NULL,
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🔗',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      profile TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      due_date DATE,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'todo',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS design_orders (
      id SERIAL PRIMARY KEY,
      client_name TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'new',
      due_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS freelance_projects (
      id SERIAL PRIMARY KEY,
      client_name TEXT NOT NULL,
      project_name TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'lead',
      deadline DATE,
      rate TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      profile TEXT NOT NULL,
      title TEXT NOT NULL,
      date DATE NOT NULL,
      time TEXT,
      notes TEXT
    );
  `;

  // Seed default app-launcher links the first time the table is empty, so
  // the dashboard isn't blank on first run. The user can edit/delete these
  // from the UI afterwards.
  const rows = await sql`SELECT COUNT(*)::int AS count FROM links;`;
  if (rows[0].count === 0) {
    const defaults: Array<[string, string, string, string, number]> = [
      ["hotel", "Booking App", "https://", "🛎️", 1],
      ["hotel", "F&B App", "https://", "🍽️", 2],
      ["hotel", "PMS", "https://", "🏨", 3],
      ["hotel", "POS", "https://", "💳", 4],
      ["hotel", "Google Sheets", "https://sheets.google.com", "📊", 5],
      ["hotel", "Email", "https://mail.google.com", "✉️", 6],
      ["hotel", "WhatsApp", "https://web.whatsapp.com", "💬", 7],
      ["design", "Order Inbox (Email)", "https://mail.google.com", "✉️", 1],
      ["design", "Google Drive", "https://drive.google.com", "🗂️", 2],
      ["design", "WhatsApp", "https://web.whatsapp.com", "💬", 3],
      ["freelance", "Email", "https://mail.google.com", "✉️", 1],
      ["freelance", "Google Drive", "https://drive.google.com", "🗂️", 2],
      ["freelance", "Website", "https://www.pixelatemv.com", "🌐", 3],
    ];
    for (const [profile, label, url, emoji, sort_order] of defaults) {
      await sql`
        INSERT INTO links (profile, label, url, emoji, sort_order)
        VALUES (${profile}, ${label}, ${url}, ${emoji}, ${sort_order});
      `;
    }
  }

  schemaReady = true;
}
