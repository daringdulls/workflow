import { PageHeader } from "@/components/ui/page-header";

const RESOURCE_ROUTES = [
  "/api/v1/guests",
  "/api/v1/reservations",
  "/api/v1/properties",
  "/api/v1/rooms",
  "/api/v1/rates",
  "/api/v1/availability",
  "/api/v1/agents",
  "/api/v1/inquiries",
  "/api/v1/quotations",
  "/api/v1/events",
];

const WEBHOOK_ROUTES = [
  { path: "/api/v1/webhooks/booking-manager", appKey: "booking_manager", desc: "Reservations created or updated in Pixel Booking Manager." },
  { path: "/api/v1/webhooks/pms", appKey: "pms", desc: "Room assignment and check-in/out status from Pixel PMS." },
  { path: "/api/v1/webhooks/restaurant", appKey: "restaurant", desc: "Order activity from Pixel Restaurant Order Manager." },
  { path: "/api/v1/webhooks/reputation", appKey: "reputation", desc: "New reviews from Pixel Reputation Manager." },
  { path: "/api/v1/webhooks/whatsapp", appKey: "whatsapp", desc: "Inbound guest WhatsApp messages — Meta Cloud API webhook, signed with WHATSAPP_APP_SECRET." },
  { path: "/api/v1/webhooks/email", appKey: "email", desc: "Inbound guest emails — point your provider here with ?secret=EMAIL_INBOUND_SECRET." },
];

export default function WebhooksApiPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-pixel-core-domain.com";

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Webhooks & API" description="Every Pixel application integrates through this versioned REST API." />

      <section>
        <p className="mb-2 text-sm font-semibold text-navy-900">Resource endpoints</p>
        <p className="mb-3 text-xs text-slate-500">
          Read-only, paginated (<code className="rounded bg-slate-100 px-1">?limit=&amp;offset=</code>). Authenticate with header{" "}
          <code className="rounded bg-slate-100 px-1">x-pixel-secret: &lt;your app secret&gt;</code>.
        </p>
        <div className="card divide-y divide-slate-100">
          {RESOURCE_ROUTES.map((route) => (
            <div key={route} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="badge bg-blue-50 text-blue-700">GET</span>
              <code className="text-navy-800">{route}</code>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm font-semibold text-navy-900">Webhook endpoints</p>
        <p className="mb-3 text-xs text-slate-500">Connected Pixel apps push changes here. Each app has its own secret configured via the server&apos;s <code className="rounded bg-slate-100 px-1">PIXEL_WEBHOOK_SECRETS</code> environment variable.</p>
        <div className="card divide-y divide-slate-100">
          {WEBHOOK_ROUTES.map((w) => (
            <div key={w.path} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="badge bg-violet-50 text-violet-700">POST</span>
                <code className="text-sm text-navy-900">
                  {appUrl}
                  {w.path}
                </code>
              </div>
              <p className="mt-1 text-xs text-slate-500">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <p className="mb-1 text-sm font-semibold text-navy-900">Authentication</p>
        <p className="text-sm text-slate-600">
          Set <code className="rounded bg-slate-100 px-1">PIXEL_WEBHOOK_SECRETS</code> to a comma-separated list of{" "}
          <code className="rounded bg-slate-100 px-1">app_key:secret</code> pairs, e.g.
        </p>
        <code className="mt-2 block rounded-lg bg-navy-900 px-3 py-2 text-xs text-white">
          PIXEL_WEBHOOK_SECRETS=booking_manager:xxxx,pms:yyyy,restaurant:zzzz,reputation:wwww
        </code>
        <p className="mt-2 text-xs text-slate-500">
          Each connected app sends its secret via <code className="rounded bg-slate-100 px-1">x-pixel-secret</code> (or{" "}
          <code className="rounded bg-slate-100 px-1">Authorization: Bearer &lt;secret&gt;</code>). Secrets are never shown in this UI once set.
        </p>
      </section>
    </div>
  );
}
