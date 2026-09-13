# Pixel Core

Pixel Core is the central integration hub for the Pixel hospitality ecosystem. It
receives booking data from **Pixel Booking Manager** (the primary booking source),
stores the shared master data (guests, reservations, rooms, rates, availability),
and distributes the relevant slice of that data to every other Pixel application —
PMS, Restaurant, Reputation, Diving, POS, B2B, Sales/B2C, and more as they come online.

```
Pixel Booking Manager → Pixel Core → Pixel PMS / Restaurant / Reputation / Diving / POS / B2B / Sales
```

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **React**
- **Tailwind CSS** — soft modern blue / dark navy theme
- **Supabase** — Postgres, Auth, Storage, Row Level Security
- Deploys cleanly to **Vercel**; designed for low-cost hosting at V1 scale

## Getting started

### 1. Create a Supabase project

Create a free project at [supabase.com](https://supabase.com), then run the SQL
migrations in `supabase/migrations/` **in order** via the SQL editor (or
`supabase db push` if you use the Supabase CLI):

```
0001_init.sql        core schema (organizations, properties, guests, reservations, rates, …)
0002_rls.sql          row level security policies + auth trigger
0003_reference_data.sql  permission catalog, system roles, Pixel app registry
0004_storage.sql      private "pixel-files" storage bucket + policies
0005_ai_agent.sql      ai_drafts table for the Pixel AI inquiry agent
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in from your Supabase project's **Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the browser)
- `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000` locally
- `PIXEL_WEBHOOK_SECRETS` — one secret per connected Pixel app, e.g.
  `booking_manager:changeme1,pms:changeme2,restaurant:changeme3,reputation:changeme4`

For the AI inquiry agent (optional, see below): `ANTHROPIC_API_KEY`,
`PIXEL_DEFAULT_ORGANIZATION_SLUG`, and the WhatsApp/email variables in
`.env.example`.

### 3. Install dependencies and seed your first organization

```bash
npm install
npm run seed -- --email you@example.com --password "SomeStrongPass123!"
```

This creates the **Cozy Hotels Maldives** organization, its starter properties, and
your first Company Admin login. It's safe to re-run. No guest, booking or lead data
is ever seeded — the app ships with clean, empty states until real data flows in.

### 4. Run it

```bash
npm run dev
```

Sign in at `http://localhost:3000/login` with the credentials the seed script printed.

## How the integration layer works

- **Inbound**: connected Pixel apps POST to `/api/v1/webhooks/{booking-manager,pms,restaurant,reputation}`,
  authenticated with an `x-pixel-secret` header matched against `PIXEL_WEBHOOK_SECRETS`.
  Reservations from Pixel Booking Manager are upserted by `(source_app, source_record_id)`
  so re-delivery never creates duplicates — Pixel Core never becomes a second
  booking-entry system.
- **Outbound**: every meaningful change writes a row to `events` (see
  `Integrations → Event Logs`), which is how other Pixel apps eventually pull or
  get pushed the slice of data relevant to them.
- **Read API**: `/api/v1/{guests,reservations,properties,rooms,rates,availability,agents,inquiries,quotations,events}`
  — paginated, authenticated the same way, documented in-app under
  `Integrations → Webhooks & API`.
- **Sync Monitor** and **App Connections** in the sidebar show live connection
  status, last sync time, and failed-record counts per app.

## Pixel AI: the B2C inquiry agent

Pixel Core includes a Claude-powered agent that handles inbound WhatsApp and
email inquiries end to end, up to the point of sending:

1. A guest message arrives at `/api/v1/webhooks/whatsapp` (Meta Cloud API) or
   `/api/v1/webhooks/email` (generic inbound-email webhook).
2. Pixel Core matches or creates the guest and a lead, and logs the inbound
   message as a communication.
3. The agent (`src/lib/ai-agent.ts`, `claude-opus-5`) calls tools that read
   your **live** data — `list_properties`, `list_room_types`,
   `check_availability`, `get_rates` — and drafts a reply plus an optional
   quotation. It never invents a price or availability claim; if it can't
   ground an answer in a tool result, it asks a clarifying question instead.
4. The draft lands in **AI Inquiries** in the sidebar as `pending` — nothing
   is ever sent automatically. A staff member reviews the reply (editable),
   the suggested quote (editable, optional), approves, and only then does it
   go out — via the WhatsApp Cloud API / Resend if those env vars are
   configured, otherwise it's marked approved with the text ready to copy and
   send manually.

To go live: set `ANTHROPIC_API_KEY` and `PIXEL_DEFAULT_ORGANIZATION_SLUG`,
subscribe a WhatsApp Cloud API webhook to `/api/v1/webhooks/whatsapp` (verify
with `WHATSAPP_VERIFY_TOKEN`, sign with `WHATSAPP_APP_SECRET`), and/or point
your email provider's inbound webhook at
`/api/v1/webhooks/email?secret=EMAIL_INBOUND_SECRET`. Outbound sending is
optional — add `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` and/or
`RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` whenever you're ready for the app to
send approved replies itself.

## Data ownership

| Owns | App |
|---|---|
| Booking creation, financials, agent, source, dates, guest count | **Pixel Booking Manager** |
| Room assignment, check-in/out, operational room status | **Pixel PMS** |
| Restaurant orders | **Pixel Restaurant Order Manager** |
| Dive operations & dive profile | **Pixel Diving** |
| Transactions & payment processing | **Pixel POS** |
| Reviews & responses | **Pixel Reputation Manager** |
| Master relationships, shared IDs, permissions, events, sync, audit history | **Pixel Core** |

Apps never touch each other's databases directly — everything goes through Pixel
Core's API and event system.

## Project structure

```
supabase/migrations/     SQL schema, RLS policies, reference data, storage bucket
scripts/seed.ts           first-run org/property/admin seed (dev & initial setup)
src/app/(app)/             the authenticated app shell + every module page
src/app/login/             sign-in
src/app/api/v1/             versioned REST + webhook endpoints for connected apps
src/app/api/search/         internal global search endpoint
src/components/shell/       sidebar, topbar, global search, property selector
src/components/dashboard/   KPI cards, app status grid, data flow visualization
src/components/ui/          shared primitives (DataTable, EmptyState, StatusBadge, …)
src/lib/                    Supabase clients, types, permissions, formatting helpers
```

## Roadmap beyond V1

The schema and permission model already have room for Pixel Diving, Pixel POS,
and Pixel B2B (agent portal) — those tables and event types exist, but their
dedicated frontends are intentionally out of scope for V1. Pixel AI (the B2C
inquiry agent) is further along — see above. Add the rest incrementally
without restructuring what's here.
