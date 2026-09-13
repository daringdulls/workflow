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
Pixel B2B (agent portal) and Pixel AI — those tables and event types exist, but
their dedicated frontends are intentionally out of scope for V1. Add them
incrementally without restructuring what's here.
