// Lightweight, dependency-free session token for a single-user dashboard.
// There is only one password (WORKFLOW_PASSWORD). On successful login we set
// a cookie whose value is HMAC-ish hash of the password + a secret, so we
// never store the plaintext password in the cookie and don't need a
// database-backed session store for a single user.

export const SESSION_COOKIE = "wf_session";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedSessionToken(): Promise<string> {
  const password = process.env.WORKFLOW_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "";
  return sha256Hex(`${password}::${secret}`);
}

export async function isValidPassword(candidate: string): Promise<boolean> {
  const password = process.env.WORKFLOW_PASSWORD ?? "";
  if (!password) return false;
  return candidate === password;
}
