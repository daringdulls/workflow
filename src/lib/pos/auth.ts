// Staff sign-in for the restaurant POS: tap your name on a roster, then
// enter your PIN — the standard POS pattern, and one that avoids needing
// unique PINs across the whole staff roster (login is staffId + PIN, not
// PIN alone). Session is a signed cookie (HMAC over JSON), so no DB-backed
// session table is needed, matching the rest of this app's approach.
import { cookies } from "next/headers";
import type { RolePermissions, StaffRole } from "./types";
import { ROLE_PERMISSIONS } from "./types";

export const POS_SESSION_COOKIE = "pos_session";

function pepper() {
  return process.env.SESSION_SECRET || process.env.WORKFLOW_PASSWORD || "pos-fallback-pepper";
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPin(pin: string): Promise<string> {
  return sha256Hex(`pin::${pin}::${pepper()}`);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return (await hashPin(pin)) === hash;
}

// Buffer isn't guaranteed in the Edge runtime that Next.js middleware runs
// on, so base64url + HMAC below stick to Web APIs (btoa/atob, SubtleCrypto)
// that work in both the Edge and Node.js runtimes.
function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function toBase64Url(input: string) {
  return bytesToBase64Url(new TextEncoder().encode(input));
}
function fromBase64Url(input: string) {
  return new TextDecoder().decode(base64UrlToBytes(input));
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(sig));
}

export interface PosSession {
  staffId: number;
  outletId: number;
  name: string;
  role: StaffRole;
}

export async function signSession(session: PosSession): Promise<string> {
  const payload = toBase64Url(JSON.stringify(session));
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<PosSession | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload);
  if (expected !== sig) return null;
  try {
    return JSON.parse(fromBase64Url(payload)) as PosSession;
  } catch {
    return null;
  }
}

// Server-side helper for API routes / server components: reads and
// validates the pos_session cookie from the incoming request.
export async function getPosSession(): Promise<PosSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(POS_SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export function permissionsFor(role: StaffRole): RolePermissions {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.waiter;
}

export function hasPermission(role: StaffRole, key: keyof RolePermissions): boolean {
  return permissionsFor(role)[key];
}
