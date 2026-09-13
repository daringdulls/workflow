# Pixel Core

Pixel Core is the central integration hub for the Pixel hospitality ecosystem. It
receives booking data from **Pixel Booking Manager** (the primary booking source),
stores the shared master data (guests, reservations, rooms, rates, availability),
and distributes the relevant slice of that data to every other Pixel application —
PMS, Restaurant, Reputation, Diving, POS, B2B, Sales/B2C, and more as they come online.

```
Customer Channels (WhatsApp / Website / Instagram / Facebook / Email / B2B Portal)
                              ↓
                       Pixel AI Agent
      (Intent Detection · Knowledge Base · Conversation Context ·
                 Tool Calling · Approval Rules)
                              ↓
                        Pixel Core
                              ↓
   Booking Manager · Rate Engine · Availability · Offers · CRM ·
        PMS · B2B · Restaurant · Diving · POS · Reputation
```

Pixel Booking Manager stays the primary source for booking creation. Pixel AI
is a second, tool-gated front door for guest-initiated inquiries — it never
writes directly to the database; every read goes through a named tool, and
anything beyond a pure informational answer waits for staff approval. See
**Pixel AI** below.

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
0006_knowledge_base_and_extended_rates.sql  Knowledge Base, dive/transfer rates, offers, escalation
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

Pixel Core includes a Claude-powered agent (`src/lib/ai-agent.ts`,
`claude-opus-5`) that reads inbound WhatsApp/email inquiries and drafts a
reply — and, when it has enough grounded information, a quotation. It never
has direct database access: every fact it can use comes from a named,
narrowly-scoped tool, so it can propose but never fabricate.

**AI decides what to ask. Pixel Core decides what is true.**

### Flow

1. A guest message arrives at `/api/v1/webhooks/whatsapp` (Meta Cloud API) or
   `/api/v1/webhooks/email` (generic inbound-email webhook).
2. Pixel Core matches or creates the guest and a lead, logs the inbound
   message, and pulls the last 10 messages on that thread for context.
3. The agent identifies intent (dates, guests, property, room, diving,
   transfers, meal plan) and calls tools — `check_availability`,
   `get_room_rates`, `get_dive_rates`, `get_transfer_rates`,
   `get_active_offers`, `search_knowledge_base`, `get_guest`,
   `get_booking_status` — to ground every claim. It computes quote totals
   itself from the unit prices those tools return (nights × rate, dives ×
   per-person price, offer discount applied) — it never asks the model to
   recall a price from memory.
4. If nothing grounds a confident answer, the agent sets `escalate: true`
   instead of guessing — the draft lands as **Human Required**, not sent.
5. Otherwise the draft lands in the **AI Inbox** (sidebar → CRM & Sales → AI
   Inbox) for review, unless it qualifies for Level 3 auto-reply (below).

### Authority levels

| Level | What | Enforcement |
|---|---|---|
| **1 — Answer only** | Read-only tool calls (availability, rates, knowledge base, booking status) | The agent has no tool that writes anything |
| **2 — Prepare actions** | Any reply that includes a quotation | Always lands as `pending` in the AI Inbox — never auto-sent, regardless of confidence |
| **3 — Automatic low-risk** | Pure informational replies (hotel info, policies, dive requirements — no quote) | Auto-sent **only** when `confidence: high`, not escalated, no quote, and the organization has opted in (Organizations → toggle "Let Pixel AI auto-send Level 3 replies") |
| **4 — Sensitive, human-only** | Discounts, rate overrides, booking confirmation/cancellation, refunds, date changes | The agent has **no tools** for any of these — they only happen through the normal Quotations/Reservations UI, by a person |

### Knowledge Base

Non-transactional questions ("do you provide towels for diving?") are
answered only from **Knowledge Base** articles (sidebar → CRM & Sales →
Knowledge Base) — categorized per property (check-in/out, meal times,
facilities, dive requirements, cancellation/payment/children policy,
restaurant menu, island info, FAQs, …). Every answer the agent gives from it
carries a source citation (`Property → Category → Article title`), shown in
the "What Pixel AI checked" panel on each AI Inbox draft. No matching
article → the agent escalates instead of guessing.

### Rate Engine

Room rates, dive rates, transfer rates and offers are four separate,
narrowly-scoped tools/tables (`rate_plans`, `dive_rates`, `transfer_rates`,
`offers`) rather than one catch-all — set them up under **Rate Engine**
(tabs for each). Offers support a minimum-nights trigger and a discount
type/value the agent applies arithmetically, never by inventing a number.

### AI Inbox status buckets

`ai_drafts.status`: `pending` (waiting on staff — this covers "New" and
"AI Handling" too, since in this request/response architecture the agent has
already run by the time a row exists to show), `human_required` (escalated),
`approved` (sent by staff but auto-send wasn't configured — copy and send
manually), `sent` (delivered, waiting on the guest), `rejected`. "Converted"
is derived, not a stored status — it's any draft whose linked quotation was
converted to a booking.

### Setup

Set `ANTHROPIC_API_KEY` and `PIXEL_DEFAULT_ORGANIZATION_SLUG`, subscribe a
WhatsApp Cloud API webhook to `/api/v1/webhooks/whatsapp` (verify with
`WHATSAPP_VERIFY_TOKEN`, sign with `WHATSAPP_APP_SECRET`), and/or point your
email provider's inbound webhook at
`/api/v1/webhooks/email?secret=EMAIL_INBOUND_SECRET`. Outbound sending is
optional — add `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` and/or
`RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` whenever you're ready for the app to
send approved (and Level 3 auto-) replies itself; without them, approved
drafts are marked ready with the text there to copy and send by hand.

### Deferred (not built yet)

B2B-specific AI pricing (checks the logged-in agent's contracted rate) needs
the B2B portal first. Module-specific agents — "who's arriving tomorrow"
(PMS), "who needs dive equipment tomorrow" (Diving), "half-board dinners
tonight" (Restaurant), "negative reviews this month" (Reputation) — reuse the
same `runInquiryAgent` tool-calling pattern once those apps' data models
exist; they're a new system prompt + tool set, not new infrastructure.
Scheduled follow-ups ("no response in 24h, check in again") need a cron
trigger (e.g. Vercel Cron) that isn't wired up yet.

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
