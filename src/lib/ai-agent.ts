import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { createServiceClient } from "@/lib/supabase/server";
import type { SuggestedQuotation } from "@/lib/database.types";
import { sourceLabel } from "@/lib/knowledge";

type ServiceClient = ReturnType<typeof createServiceClient>;

const MODEL = "claude-opus-5";

const FinalAnswerSchema = z.object({
  intent: z.string(),
  guest_reply: z.string(),
  quote: z
    .object({
      property_code: z.string(),
      room_type_code: z.string().nullable(),
      arrival_date: z.string(),
      departure_date: z.string(),
      meal_plan: z.string().nullable(),
      currency: z.string(),
      accommodation_amount: z.number(),
      notes: z.string().nullable(),
    })
    .nullable(),
  needs_more_info: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  escalate: z.boolean(),
  escalation_reason: z.string().nullable(),
});

export interface AgentToolLogEntry {
  tool: string;
  input: unknown;
  result_summary: string;
}

export interface AgentInput {
  organizationId: string;
  channel: "whatsapp" | "email";
  guestName: string | null;
  contactAddress: string;
  message: string;
  /** Prior messages on this thread, oldest first — gives the agent conversation continuity. */
  priorMessages?: { direction: "inbound" | "outbound" | "internal"; message: string }[];
}

export interface AgentResult {
  intent: string;
  replyDraft: string;
  suggestedQuotation: SuggestedQuotation | null;
  needsMoreInfo: string[];
  confidence: string;
  escalate: boolean;
  escalationReason: string | null;
  toolLog: AgentToolLogEntry[];
  modelUsed: string;
}

// ── Authority levels ────────────────────────────────────────────────────────
// Level 1  Answer only — read tools, no pricing, no side effects.
// Level 2  Prepare actions — quotation math is computed, but a human always
//          approves before anything is sent (never auto-sent, regardless of
//          confidence).
// Level 3  Automatic low-risk replies — pure informational answers (no quote)
//          may be auto-sent when the org has enabled it AND confidence is high
//          AND the agent did not escalate. Enforced by the caller
//          (handleInboundInquiry), not by this module.
// Level 4  Sensitive actions (discounts, rate overrides, booking confirmation/
//          cancellation, refunds, date changes) — this agent has NO tools that
//          can perform these. They stay human-only, done through the normal
//          Quotations/Reservations UI.

const SYSTEM_PROMPT = `You are the Pixel AI reservations assistant for a hospitality group on Pixel Core. \
A guest inquiry has come in over WhatsApp or email, possibly as part of an ongoing conversation. \
Draft a warm, professional, accurate reply that a staff member will review before it is sent — you \
never send anything yourself and you never confirm a booking.

AI decides what to ask. Pixel Core decides what is true. Ground every fact — availability, prices, \
taxes, offers, transfer prices, room inventory, booking status, hotel/dive/restaurant information, \
policies — in a tool result. Never invent or estimate any of these. If tools return no data for what \
you need, say so in the reply and set escalate accordingly rather than guessing.

When a guest asks about accommodation, diving, transfers or a package:
1. Identify what they're asking for: dates, number of guests, property, room needs, diving (and how many \
dives), transfers, meal plan. If a property isn't named, use list_properties to find it (e.g. from an \
island or area name) or ask which property they mean.
2. Call check_availability for the relevant property/room type/dates before claiming anything is available.
3. Call get_room_rates for accommodation pricing. Call get_dive_rates when diving is mentioned. Call \
get_transfer_rates when transfers/flights are mentioned. Call get_active_offers and apply any offer whose \
trigger is met (e.g. a minimum-nights offer) — do the discount arithmetic yourself from the returned \
discount_type/discount_value, never invent a percentage.
4. Build the total quote strictly from the numbers tools returned (nights × room rate, dives × per-person \
dive price × number of guests, transfers × per-person price × guests, minus any applicable offer). Show \
this breakdown in the reply so it's easy for staff to verify.

For non-transactional questions (hotel facilities, check-in time, dive requirements, cancellation policy, \
restaurant info, island information, FAQs), call search_knowledge_base. Only answer from what it returns, \
and mention you're happy to send more detail — never fabricate policy details. If search_knowledge_base \
returns nothing relevant, do not guess: set escalate to true instead ("I'll check this with our \
reservations team." style reply) with a clear escalation_reason.

Use get_guest for returning-guest context (VIP status, past stays) and get_booking_status when a guest \
asks about an existing booking. Do not attempt to modify a booking, apply a discount, override a rate, or \
confirm/cancel anything — those require staff action outside this conversation; if asked, say a team \
member will help and set escalate to true.

If you don't have enough information to check availability or pricing (missing dates, property, or guest \
count), don't guess — ask a clarifying question in guest_reply and list what's missing in needs_more_info.

Set intent to a short label such as "quotation_request", "availability_check", "faq", "booking_status", \
"escalation", or "other".

Keep guest_reply concise, friendly, and ready to send with only minor edits. A quote is not a confirmed \
booking until staff follow up.

End your final turn with exactly one fenced json code block matching this shape (quote is null unless you \
have a fully tool-grounded price; escalation_reason is null unless escalate is true):

\`\`\`json
{
  "intent": "string",
  "guest_reply": "string",
  "quote": {
    "property_code": "string",
    "room_type_code": "string or null",
    "arrival_date": "YYYY-MM-DD",
    "departure_date": "YYYY-MM-DD",
    "meal_plan": "string or null",
    "currency": "string",
    "accommodation_amount": 0,
    "notes": "string or null — include the full breakdown (accommodation, diving, transfers, offer applied) here"
  } | null,
  "needs_more_info": ["string"],
  "confidence": "high" | "medium" | "low",
  "escalate": true | false,
  "escalation_reason": "string or null"
}
\`\`\``;

function tools(): Anthropic.Tool[] {
  return [
    {
      name: "list_properties",
      description: "List every property in this organization, with code, name, city and currency.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      name: "list_room_types",
      description: "List room types for a property, with code, name, max guests, base occupancy and description.",
      input_schema: {
        type: "object",
        properties: { property_code: { type: "string" } },
        required: ["property_code"],
        additionalProperties: false,
      },
    },
    {
      name: "check_availability",
      description:
        "Check room availability for a property (optionally a specific room type) over a date range. " +
        "Returns per-room-type available room counts.",
      input_schema: {
        type: "object",
        properties: {
          property_code: { type: "string" },
          room_type_code: { type: "string", description: "Optional. Omit to check all room types." },
          arrival_date: { type: "string", description: "YYYY-MM-DD" },
          departure_date: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["property_code", "arrival_date", "departure_date"],
        additionalProperties: false,
      },
    },
    {
      name: "get_room_rates",
      description: "Get active public room rates and promotions for a property covering a date range, including meal plan, currency, amount and cancellation policy.",
      input_schema: {
        type: "object",
        properties: {
          property_code: { type: "string" },
          room_type_code: { type: "string", description: "Optional. Omit to check all room types." },
          arrival_date: { type: "string", description: "YYYY-MM-DD" },
          departure_date: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["property_code", "arrival_date", "departure_date"],
        additionalProperties: false,
      },
    },
    {
      name: "get_dive_rates",
      description: "Get active dive packages for a property: dives included, price per person, minimum participants.",
      input_schema: {
        type: "object",
        properties: { property_code: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD, any date in the stay" } },
        required: ["property_code"],
        additionalProperties: false,
      },
    },
    {
      name: "get_transfer_rates",
      description: "Get active transfer rates for a property (domestic flights, speedboats, seaplanes), price per person by direction.",
      input_schema: {
        type: "object",
        properties: { property_code: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD, any date in the stay" } },
        required: ["property_code"],
        additionalProperties: false,
      },
    },
    {
      name: "get_active_offers",
      description: "Get active offers/promotions for a property (or org-wide) — discount type, value, and any minimum-nights trigger.",
      input_schema: {
        type: "object",
        properties: { property_code: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD, any date in the stay" } },
        required: ["property_code"],
        additionalProperties: false,
      },
    },
    {
      name: "search_knowledge_base",
      description:
        "Search approved property information — check-in/out times, meal times, facilities, diving info, dive requirements, " +
        "cancellation/payment/children/extra-bed policy, restaurant menu, activities, bike rental, island info, emergency info, FAQs. " +
        "Use this for any non-transactional question. Returns matching articles with their content and source.",
      input_schema: {
        type: "object",
        properties: {
          property_code: { type: "string", description: "Optional. Omit to search org-wide content too." },
          query: { type: "string", description: "Keywords from the guest's question." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "get_guest",
      description: "Look up an existing guest by phone or email for context (VIP status, past stays, preferences).",
      input_schema: {
        type: "object",
        properties: { contact_address: { type: "string", description: "Phone number or email address." } },
        required: ["contact_address"],
        additionalProperties: false,
      },
    },
    {
      name: "get_booking_status",
      description: "Look up an existing reservation's status by booking number.",
      input_schema: {
        type: "object",
        properties: { booking_number: { type: "string" } },
        required: ["booking_number"],
        additionalProperties: false,
      },
    },
  ];
}

async function executeTool(supabase: ServiceClient, organizationId: string, name: string, input: any): Promise<unknown> {
  switch (name) {
    case "list_properties": {
      const { data } = await supabase
        .from("properties")
        .select("code, name, city, country, currency")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .order("name");
      return data ?? [];
    }
    case "list_room_types": {
      const property = await findProperty(supabase, organizationId, input.property_code);
      if (!property) return { error: `Unknown property_code ${input.property_code}` };
      const { data } = await supabase
        .from("room_types")
        .select("code, name, max_guests, base_occupancy, description")
        .eq("property_id", property.id)
        .eq("status", "active")
        .order("name");
      return data ?? [];
    }
    case "check_availability": {
      const property = await findProperty(supabase, organizationId, input.property_code);
      if (!property) return { error: `Unknown property_code ${input.property_code}` };

      let roomTypeIds: string[] | null = null;
      if (input.room_type_code) {
        const rt = await findRoomType(supabase, property.id, input.room_type_code);
        if (!rt) return { error: `Unknown room_type_code ${input.room_type_code}` };
        roomTypeIds = [rt.id];
      }

      let query = supabase
        .from("availability_daily")
        .select("date, room_type_id, available_rooms, room_types(code, name)")
        .eq("property_id", property.id)
        .gte("date", input.arrival_date)
        .lt("date", input.departure_date);
      if (roomTypeIds) query = query.in("room_type_id", roomTypeIds);
      const { data } = await query.order("date");

      if (!data || data.length === 0) {
        return { note: "No pre-calculated availability found for this range. Advise the guest that availability will be confirmed, and set confidence to medium or low." };
      }

      const byRoomType = new Map<string, { room_type: string; min_available: number; nights_checked: number }>();
      for (const row of data as any[]) {
        const key = row.room_types?.code ?? row.room_type_id;
        const label = row.room_types?.name ?? key;
        const existing = byRoomType.get(key);
        if (!existing) byRoomType.set(key, { room_type: label, min_available: row.available_rooms, nights_checked: 1 });
        else {
          existing.min_available = Math.min(existing.min_available, row.available_rooms);
          existing.nights_checked += 1;
        }
      }
      return Array.from(byRoomType.values());
    }
    case "get_room_rates": {
      const property = await findProperty(supabase, organizationId, input.property_code);
      if (!property) return { error: `Unknown property_code ${input.property_code}` };

      let roomTypeId: string | null = null;
      if (input.room_type_code) {
        const rt = await findRoomType(supabase, property.id, input.room_type_code);
        if (!rt) return { error: `Unknown room_type_code ${input.room_type_code}` };
        roomTypeId = rt.id;
      }

      let query = supabase
        .from("rate_plans")
        .select("name, rate_type, meal_plan, currency, amount, min_stay, max_stay, cancellation_policy, room_type_id, room_types(code, name)")
        .eq("property_id", property.id)
        .in("rate_type", ["public", "promotion"])
        .eq("status", "active")
        .lte("start_date", input.departure_date)
        .gte("end_date", input.arrival_date)
        .is("agent_id", null);
      if (roomTypeId) query = query.or(`room_type_id.eq.${roomTypeId},room_type_id.is.null`);
      const { data } = await query;

      if (!data || data.length === 0) {
        return { note: "No active public rate found for this property/date range. Do not invent a price — ask a clarifying question or set confidence to low." };
      }
      return (data as any[]).map((r) => ({
        name: r.name,
        rate_type: r.rate_type,
        room_type: r.room_types?.name ?? "All room types",
        meal_plan: r.meal_plan,
        currency: r.currency,
        amount_per_night: r.amount,
        min_stay: r.min_stay,
        max_stay: r.max_stay,
        cancellation_policy: r.cancellation_policy,
      }));
    }
    case "get_dive_rates": {
      const property = await findProperty(supabase, organizationId, input.property_code);
      if (!property) return { error: `Unknown property_code ${input.property_code}` };
      const date = input.date ?? new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("dive_rates")
        .select("package_name, dives_included, price_per_person, currency, min_participants, notes")
        .eq("property_id", property.id)
        .eq("status", "active")
        .lte("start_date", date)
        .gte("end_date", date);
      if (!data || data.length === 0) return { note: "No active dive rate found. Do not invent a diving price — ask a clarifying question or escalate." };
      return data;
    }
    case "get_transfer_rates": {
      const property = await findProperty(supabase, organizationId, input.property_code);
      if (!property) return { error: `Unknown property_code ${input.property_code}` };
      const date = input.date ?? new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("transfer_rates")
        .select("transfer_type, direction, price_per_person, currency, notes")
        .eq("property_id", property.id)
        .eq("status", "active")
        .lte("start_date", date)
        .gte("end_date", date);
      if (!data || data.length === 0) return { note: "No active transfer rate found. Do not invent a transfer price — ask a clarifying question or escalate." };
      return data;
    }
    case "get_active_offers": {
      const property = await findProperty(supabase, organizationId, input.property_code);
      if (!property) return { error: `Unknown property_code ${input.property_code}` };
      const date = input.date ?? new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("offers")
        .select("name, description, promo_code, discount_type, discount_value, trigger_min_nights, applies_to")
        .or(`property_id.eq.${property.id},property_id.is.null`)
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .lte("start_date", date)
        .gte("end_date", date);
      return data ?? [];
    }
    case "search_knowledge_base": {
      let propertyId: string | null = null;
      if (input.property_code) {
        const property = await findProperty(supabase, organizationId, input.property_code);
        propertyId = property?.id ?? null;
      }
      const like = `%${input.query}%`;
      let query = supabase
        .from("knowledge_base_articles")
        .select("category, title, content, property_id, properties(name)")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .or(`title.ilike.${like},content.ilike.${like}`)
        .limit(5);
      if (propertyId) query = query.or(`property_id.eq.${propertyId},property_id.is.null`);
      const { data } = await query;
      if (!data || data.length === 0) return { note: "No matching knowledge base article. Do not guess the answer — escalate instead." };
      return (data as any[]).map((a) => ({
        title: a.title,
        content: a.content,
        source: sourceLabel(a.properties?.name ?? null, a.category, a.title),
      }));
    }
    case "get_guest": {
      const { data } = await supabase
        .from("guests")
        .select("guest_number, first_name, last_name, vip_status, nationality, dietary_requirements, special_requirements")
        .eq("organization_id", organizationId)
        .or(`email.eq.${input.contact_address},phone.eq.${input.contact_address},whatsapp.eq.${input.contact_address}`)
        .maybeSingle();
      return data ?? { note: "No existing guest profile found." };
    }
    case "get_booking_status": {
      const { data } = await supabase
        .from("reservations")
        .select("booking_number, arrival_date, departure_date, booking_status, payment_status, outstanding_amount, currency")
        .eq("organization_id", organizationId)
        .eq("booking_number", input.booking_number)
        .maybeSingle();
      return data ?? { note: "No booking found with that number." };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

async function findProperty(supabase: ServiceClient, organizationId: string, code: string) {
  const { data } = await supabase.from("properties").select("id").eq("organization_id", organizationId).eq("code", code).maybeSingle();
  return data;
}

async function findRoomType(supabase: ServiceClient, propertyId: string, code: string) {
  const { data } = await supabase.from("room_types").select("id").eq("property_id", propertyId).eq("code", code).maybeSingle();
  return data;
}

function extractFinalAnswer(text: string): z.infer<typeof FinalAnswerSchema> | null {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    return FinalAnswerSchema.parse(JSON.parse(match[1]));
  } catch {
    return null;
  }
}

export async function runInquiryAgent(input: AgentInput, supabase: ServiceClient): Promise<AgentResult> {
  const client = new Anthropic();
  const toolLog: AgentToolLogEntry[] = [];

  const historyText = (input.priorMessages ?? [])
    .map((m) => `[${m.direction}] ${m.message}`)
    .join("\n");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        (historyText ? `Prior conversation on this thread:\n${historyText}\n\n` : "") +
        `Channel: ${input.channel}\nGuest name: ${input.guestName ?? "unknown"}\nContact: ${input.contactAddress}\n\nLatest message:\n${input.message}`,
    },
  ];

  let finalText = "";
  for (let iteration = 0; iteration < 8; iteration++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: tools(),
      messages,
    });

    const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
    finalText = textBlocks.map((b) => b.text).join("\n");

    if (response.stop_reason !== "tool_use") break;

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      const result = await executeTool(supabase, input.organizationId, toolUse.name, toolUse.input);
      toolLog.push({ tool: toolUse.name, input: toolUse.input, result_summary: JSON.stringify(result).slice(0, 500) });
      toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) });
    }
    messages.push({ role: "user", content: toolResults });
  }

  const parsed = extractFinalAnswer(finalText);
  if (parsed) {
    return {
      intent: parsed.intent,
      replyDraft: parsed.guest_reply,
      suggestedQuotation: parsed.quote,
      needsMoreInfo: parsed.needs_more_info,
      confidence: parsed.confidence,
      escalate: parsed.escalate,
      escalationReason: parsed.escalation_reason,
      toolLog,
      modelUsed: MODEL,
    };
  }

  return {
    intent: "other",
    replyDraft: finalText || "The assistant could not generate a reply. Please respond to this guest manually.",
    suggestedQuotation: null,
    needsMoreInfo: ["Agent response could not be parsed — please review and draft a reply manually."],
    confidence: "low",
    escalate: true,
    escalationReason: "Agent output did not match the expected format.",
    toolLog,
    modelUsed: MODEL,
  };
}
