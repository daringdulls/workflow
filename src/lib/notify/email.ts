/**
 * Sends an email via the Resend API. Requires RESEND_API_KEY and
 * EMAIL_FROM_ADDRESS — if either is missing, this is a no-op so the app stays
 * usable before that's configured. Swap the fetch body for another provider
 * (Postmark, SendGrid, SES) without touching any caller.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM_ADDRESS;
  if (!apiKey || !from) {
    return { sent: false, reason: "Email send is not configured (RESEND_API_KEY / EMAIL_FROM_ADDRESS)." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: body,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { sent: false, reason: `Email API error (${res.status}): ${text.slice(0, 300)}` };
  }
  return { sent: true };
}
