# WorkFlow — Pixelate MV

One dashboard for all three of your jobs: Hotel Operations / Revenue / F&B, Graphic Design for the sublimation printing company, and freelance work. Switch profiles at the top; each profile gets its own app launcher, task list, and calendar, plus a combined "All Work" view for the day. It's a real web app (Next.js + Postgres) so it works the same from your phone or laptop and everything saves automatically.

## What's inside

- **All Work** — a combined task list and calendar across everything, for daily planning.
- **Hotel Ops** — quick-launch tiles for your Booking app, F&B app, PMS, POS, Sheets, Email, WhatsApp (edit the links to point at your real apps), plus tasks and a calendar.
- **Graphic Design** — the same, plus a kanban board (New → In Progress → Review → Delivered) for design requests, each with a client name, priority, and due date.
- **Freelance** — the same, plus a project tracker (Lead → Active → In Review → Delivered → Paid) with client, deadline, and rate.
- One shared password gate, since this will be reachable on the internet.

## 1. Put this on GitHub

```bash
cd workflow-app
git init
git add .
git commit -m "Initial WorkFlow dashboard"
```

Then create an empty repo on GitHub (github.com → New repository, don't initialize with a README), and push:

```bash
git remote add origin https://github.com/<your-username>/workflow.git
git branch -M main
git push -u origin main
```

## 2. Create the database (Neon Postgres via Vercel)

1. Go to [vercel.com](https://vercel.com) and sign in (or sign up) with your GitHub account.
2. Click **Add New → Project**, pick the `workflow` repo you just pushed, and click **Deploy**. The first deploy will succeed for the build but the app won't work yet — it has no database or password set. That's expected, continue below.
3. In the project, open the **Storage** tab → **Create Database** → choose **Postgres** (this provisions a free Neon database and links it to your project automatically).
4. Once created, Vercel automatically adds a `DATABASE_URL` (and a couple of related) environment variable to your project. You don't need to copy/paste anything for this part.

## 3. Set your password

1. In the Vercel project, go to **Settings → Environment Variables**.
2. Add:
   - `WORKFLOW_PASSWORD` — the password you'll type to unlock the dashboard. Pick something only you know.
   - `SESSION_SECRET` — any long random string (e.g. run `openssl rand -hex 32` in a terminal, or just mash the keyboard for 40+ characters).
3. Go to **Deployments**, open the latest one, and click **Redeploy** so the new environment variables take effect.

That's it — open the deployment URL Vercel gives you (something like `workflow-xyz.vercel.app`), enter your password, and you're in. The database tables are created automatically the first time the app talks to them.

## 4. Put it on your own domain (optional but recommended)

Since you already own **pixelatemv.com**, it's worth putting this at a subdomain like `workflow.pixelatemv.com` instead of the default vercel.app address:

1. In the Vercel project, go to **Settings → Domains**, and add `workflow.pixelatemv.com`.
2. Vercel will show you a CNAME record to add. Go to wherever pixelatemv.com's DNS is managed and add that record (usually: type `CNAME`, name `workflow`, value the target Vercel gives you).
3. Wait a few minutes for DNS to propagate, then `workflow.pixelatemv.com` will load the dashboard directly.

## 5. Using it day to day

- **Quick Launch** tiles open your real apps in a new tab — click "+ Add app" the first time to point the Hotel Ops tiles at your actual Booking app, F&B app, PMS, and POS URLs (they're placeholders right now). You can add/remove tiles any time.
- **Tasks** have a priority (Low/Medium/High/Urgent) and an optional due date. Anything with a due date shows up automatically on the Calendar.
- **Calendar** pulls together task due dates, design order due dates, freelance deadlines, and anything you add directly as a note/meeting for a day — click a day to see everything on it.
- The **Design Requests** board and **Freelance Projects** tracker are just for those two profiles; drag isn't wired up, but the ← → arrows (design) and the status dropdown (freelance) move things along.
- Everything is shared across devices in real time because it's backed by a real database — add a task on your phone, see it on your laptop a moment later.

## Local development (optional)

If you want to run this on your own machine before/instead of deploying:

```bash
npm install
cp .env.example .env.local   # then fill in WORKFLOW_PASSWORD, SESSION_SECRET, and DATABASE_URL
npm run dev
```

For `DATABASE_URL` locally, either pull Vercel's: `npx vercel env pull .env.local` (after `npx vercel link`), or point it at any Postgres you have (Neon's free tier works standalone too, at [neon.tech](https://neon.tech)).

## Project structure

```
src/app/            Pages and API routes (Next.js App Router)
src/app/api/        REST endpoints: tasks, links, design-orders, freelance-projects, events
src/components/      Dashboard UI: ProfileTabs, AppLauncher, TaskList, Calendar, DesignBoard, FreelanceTracker
src/lib/db.ts        Database connection + auto schema creation (Neon serverless Postgres)
src/lib/auth.ts       Single-password session logic
src/middleware.ts     Gates every page/API route behind the password
schema.sql             Reference copy of the table definitions (created automatically, not needed to run by hand)
```

## Extending it later

A few natural next additions, whenever you want them: recurring tasks, email/WhatsApp notification reminders for due dates, a simple invoicing view for freelance work, or pulling live numbers from your existing Booking/F&B apps into the Hotel Ops summary tiles. The data model (`src/lib/types.ts`) is intentionally small so any of these are incremental changes, not rewrites.
