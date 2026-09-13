import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handleInboundInquiry } from "@/lib/inbound-inquiry";

// Meta's webhook subscription verification handshake.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  return provided.length === expectedBuf.length && crypto.timingSafeEqual(provided, expectedBuf);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const messages: { from: string; text?: { body: string }; type: string }[] =
    payload.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
  const contacts: { profile?: { name?: string }; wa_id: string }[] = payload.entry?.[0]?.changes?.[0]?.value?.contacts ?? [];

  for (const message of messages) {
    if (message.type !== "text" || !message.text?.body) continue;
    const contact = contacts.find((c) => c.wa_id === message.from);
    try {
      await handleInboundInquiry({
        channel: "whatsapp",
        contactAddress: message.from,
        guestName: contact?.profile?.name ?? null,
        message: message.text.body,
      });
    } catch (err) {
      console.error("WhatsApp inquiry handling failed:", err);
    }
  }

  // Meta requires a fast 200 regardless of downstream outcome, or it retries aggressively.
  return NextResponse.json({ ok: true });
}
