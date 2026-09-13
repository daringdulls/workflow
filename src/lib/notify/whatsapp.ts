/**
 * Sends a WhatsApp message via the Meta WhatsApp Cloud API.
 * Requires WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID — if either is
 * missing, this is a no-op so the app stays usable before that's configured.
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<{ sent: boolean; reason?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { sent: false, reason: "WhatsApp send is not configured (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)." };
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { sent: false, reason: `WhatsApp API error (${res.status}): ${text.slice(0, 300)}` };
  }
  return { sent: true };
}
