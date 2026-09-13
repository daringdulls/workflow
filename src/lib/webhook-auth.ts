import { NextRequest } from "next/server";

/**
 * PIXEL_WEBHOOK_SECRETS is a comma-separated list of "app_key:secret" pairs,
 * e.g. "booking_manager:xxxx,pms:yyyy". Each connected Pixel app authenticates
 * inbound webhook calls with its own secret via the `x-pixel-secret` header
 * (or `Authorization: Bearer <secret>`).
 */
function loadSecrets(): Record<string, string> {
  const raw = process.env.PIXEL_WEBHOOK_SECRETS ?? "";
  const map: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [key, secret] = pair.split(":");
    if (key && secret) map[key.trim()] = secret.trim();
  }
  return map;
}

export function verifyWebhookSecret(request: NextRequest, appKey: string): boolean {
  const secrets = loadSecrets();
  const expected = secrets[appKey];
  // No secret configured yet for this app — reject rather than silently accept.
  if (!expected) return false;

  const provided =
    request.headers.get("x-pixel-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  return provided !== null && provided === expected;
}

export function verifyAnyApiKey(request: NextRequest): string | null {
  const secrets = loadSecrets();
  const provided =
    request.headers.get("x-pixel-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  if (!provided) return null;
  const match = Object.entries(secrets).find(([, secret]) => secret === provided);
  return match ? match[0] : null;
}
