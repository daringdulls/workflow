import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handleInboundInquiry } from "@/lib/inbound-inquiry";

// Generic inbound-email webhook. Point your provider's inbound webhook at:
//   /api/v1/webhooks/email?secret=<EMAIL_INBOUND_SECRET>
// Accepts the common field names used by Postmark, Resend and SendGrid Inbound
// Parse — adjust the field lookups below if your provider's shape differs.

function verifySecret(request: NextRequest): boolean {
  const expected = process.env.EMAIL_INBOUND_SECRET;
  const provided = request.nextUrl.searchParams.get("secret");
  if (!expected || !provided) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  return providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
}

function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const fromRaw: string | undefined = body.from ?? body.From ?? body.sender ?? body.envelope?.from ?? body.FromFull?.Email;
  const text: string | undefined = body.text ?? body.TextBody ?? body.body ?? body["stripped-text"] ?? body.plain;
  const fromName: string | undefined = body.fromName ?? body.FromName ?? body.FromFull?.Name;

  if (!fromRaw || !text) {
    return NextResponse.json({ error: "Could not find sender or message text in payload" }, { status: 400 });
  }

  try {
    await handleInboundInquiry({
      channel: "email",
      contactAddress: extractEmailAddress(fromRaw),
      guestName: fromName ?? null,
      message: text,
    });
  } catch (err) {
    console.error("Email inquiry handling failed:", err);
    return NextResponse.json({ error: "Failed to process inquiry" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
