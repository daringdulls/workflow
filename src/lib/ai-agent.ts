import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { createServiceClient } from "@/lib/supabase/server";
import { sourceLabel } from "@/lib/knowledge";
import { sendWhatsAppMessage } from "@/lib/notify/whatsapp";
import { sendEmail } from "@/lib/notify/email";

type ServiceClient = ReturnType<typeof createServiceClient>;

const MODEL = "claude-opus-5";

const FinalAnswerSchema = z.object({
  intent: z.string(),
  guest_reply: z.string(),
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

export interface ExistingQuotationSummary {
  quotation_number: string;
  status: string;
  total_amount: number;
  currency: string;
  arrival_date: string | null;
  departure_date: string | null;
  expiry_date: string | null;
}

export interface AgentInput {
  organizationId: string;
  leadId: string | null;
  guestId: string | null;
  channel: "whatsapp" | "email";
  guestName: string | null;
  contactAddress: string;
  message: string;
  /** Prior messages on this thread, oldest first — gives the agent conversation continuity. */
  priorMessages?: { direction: "inbound" | "outbound" | "internal"; message: string }[];
  /** Quotations already on file for this lead, so the agent can reference/resend without re-pricing. */
  existingQuotations?: ExistingQuotationSummary[];
}

export interface AgentResult {
  intent: string;
  replyDraft: string;
  needsMoreInfo: string[];
  confidence: string;
  escalate: boolean;
  escalationReason: string | null;
  toolLog: AgentToolLogEntry[];
  modelUsed: string;
  /** Set when create_quotation was called this run — a real draft quotation now exists. */
  quotationId: string | null;
  quotationNumber: string | null;
  quotationTotal: number | null;
  quotationCurrency: string | null;
  /** send_quotation was called on a brand-new (never-before-sent) quotation — gated, needs staff approval. */
  sendGated: boolean;
  /** send_quotation actually dispatched a previously-sent quotation being resent (Level 3). */
  autoSentQuotation: boolean;
  /** create_booking was called — always requires staff confirmation, never auto-books. */
  bookingRequested: boolean;
}

// ── Authority levels ────────────────────────────────────────────────────────
// Level 1  Answer only — read-only tools, no side effects.
// Level 2  Prepare actions — create_quotation writes a real draft quotation
//          (safe: nothing has reached the guest yet). Calling send_quotation
//          on that brand-new draft does NOT deliver it — Pixel Core gates it
//          for staff approval. This is enforced inside the send_quotation
//          tool implementation itself, not by the model's judgment.
// Level 3  Automatic low-risk actions — resending an EXISTING, already-sent
//          quotation (send_quotation on a non-draft quotation) is safe and
//          executes for real, same as purely informational replies (handled
//          by the caller, handleInboundInquiry, for non-quotation answers).
// Level 4  Sensitive, human-only — create_booking NEVER creates a
//          reservation itself; it only flags the quotation for staff
//          confirmation. Discounts, rate overrides, cancellations and
//          refunds have no tool at all — there is no code path for the
//          agent to perform them.

const SYSTEM_PROMPT = `You are the Pixel AI reservations assistant for a hospitality group on Pixel Core. \
A guest inquiry has come in over WhatsApp or email, possibly as part of an ongoing conversation. \
Draft a warm, professional, accurate reply — you have real tools, but Pixel Core enforces what's safe to \
execute automatically versus what needs a human, regardless of what you decide to call.

AI decides what to ask. Pixel Core decides what is true. Ground every fact — availability, prices, taxes, \
offers, transfer prices, room inventory, booking status, hotel/dive/restaurant information, policies — in \
a tool result. Never invent or estimate any of these, and never state a price you haven't produced through \
create_quotation. If tools return no data for what you need, say so and set escalate rather than guessing.

When a guest asks about accommodation, diving, transfers or a package:
1. Identify what they're asking for: dates, number of guests, property, room needs, diving (and how many \
dives), transfers, meal plan. If a property isn't named, use list_properties to find it (e.g. from an \
island or area name) or ask which property they mean.
2. Call check_availability for the relevant property/room type/dates before claiming anything is available.
3. Call get_room_rates for accommodation pricing. Call get_dive_rates when diving is mentioned. Call \
get_transfer_rates when transfers/flights are mentioned. Call get_active_offers and apply any offer whose \
trigger is met (e.g. a minimum-nights offer) — do the discount arithmetic yourself from the returned \
discount_type/discount_value, never invent a percentage.
4. Once you have every number from tools, call create_quotation with the full breakdown (accommodation, \
diving, transfers, discount) — this is what actually produces a quote; never just describe a price in text. \
It writes a real draft record, which is safe (the guest hasn't seen it yet).
5. Then call send_quotation with the quotation_number you just got. If it's brand new, Pixel Core will \
queue it for staff approval instead of delivering it — that's expected, not an error. Phrase guest_reply \
accordingly ("I've put together a quote for you and I'm just getting it finalized — it'll be with you \
shortly") rather than claiming it's already sent.
6. If the guest is asking you to resend a quote they already have (see "Existing quotations" in the \
context below), call send_quotation with that existing quotation_number instead of creating a new one — \
resending something already sent is fine to actually deliver.
7. If a guest says they want to book / confirm / go ahead with a quotation, call create_booking with its \
quotation_number. This never confirms a booking by itself — it flags it for staff. Tell the guest a team \
member will confirm shortly, not that the booking is confirmed.

For non-transactional questions (hotel facilities, check-in time, dive requirements, cancellation policy, \
restaurant info, island information, FAQs), call search_knowledge_base. Only answer from what it returns. \
If it returns nothing relevant, do not guess: set escalate to true instead ("I'll check this with our \
reservations team." style reply) with a clear escalation_reason.

Use get_guest for returning-guest context and get_booking_status when a guest asks about an existing \
reservation. There is no tool to apply a discount, override a rate, or cancel/refund anything — if asked, \
say a team member will help and set escalate to true.

If you don't have enough information to check availability or price something, don't guess — ask a \
clarifying question in guest_reply and list what's missing in needs_more_info.

Set intent to a short label such as "quotation_request", "availability_check", "faq", "booking_status", \
"booking_request", "escalation", or "other".

Keep guest_reply concise, friendly, and ready to send with only minor edits.

End your final turn with exactly one fenced json code block matching this shape:

\`\`\`json
{
  "intent": "string",
  "guest_reply": "string",
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
    {
      name: "create_quotation",
      description:
        "Create a draft quotation from tool-grounded numbers only. Safe to call once you have real availability and " +
        "rate/dive/transfer/offer data — it writes a draft record the guest never sees until send_quotation delivers it. " +
        "Returns quotation_number and total_amount.",
      input_schema: {
        type: "object",
        properties: {
          property_code: { type: "string" },
          room_type_code: { type: "string" },
          arrival_date: { type: "string", description: "YYYY-MM-DD" },
          departure_date: { type: "string", description: "YYYY-MM-DD" },
          meal_plan: { type: "string" },
          currency: { type: "string" },
          accommodation_amount: { type: "number" },
          dive_amount: { type: "number", description: "Total diving cost across all guests, default 0" },
          transfer_amount: { type: "number", description: "Total transfer cost across all guests, default 0" },
          discount_amount: { type: "number", description: "Total discount applied from an active offer, default 0" },
          notes: { type: "string", description: "Breakdown explanation for staff, e.g. which offer was applied and how the total was computed." },
        },
        required: ["property_code", "arrival_date", "departure_date", "currency", "accommodation_amount"],
        additionalProperties: false,
      },
    },
    {
      name: "send_quotation",
      description:
        "Send a quotation to the guest. If this quotation_number is brand new (never sent before), Pixel Core queues it " +
        "for staff approval instead of delivering it — you'll get queued_for_approval: true back, which is expected, not " +
        "an error. If it was already sent before, this resends it for real.",
      input_schema: {
        type: "object",
        properties: { quotation_number: { type: "string" } },
        required: ["quotation_number"],
        additionalProperties: false,
      },
    },
    {
      name: "create_booking",
      description:
        "Flag a quotation as ready to book. This never confirms a reservation by itself — it always notifies staff for " +
        "confirmation. Use when a guest clearly says they want to proceed with a specific quotation.",
      input_schema: {
        type: "object",
        properties: { quotation_number: { type: "string" } },
        required: ["quotation_number"],
        additionalProperties: false,
      },
    },
  ];
}

interface ToolContext {
  supabase: ServiceClient;
  organizationId: string;
  leadId: string | null;
  guestId: string | null;
  channel: "whatsapp" | "email";
  contactAddress: string;
}

interface SideEffects {
  quotationId: string | null;
  quotationNumber: string | null;
  quotationTotal: number | null;
  quotationCurrency: string | null;
  sendGated: boolean;
  autoSentQuotation: boolean;
  bookingRequested: boolean;
}

async function executeTool(ctx: ToolContext, name: string, input: any, effects: SideEffects): Promise<unknown> {
  const { supabase, organizationId } = ctx;
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
    case "create_quotation": {
      if (!ctx.leadId) return { error: "No lead is attached to this conversation — cannot create a quotation." };
      const property = await findProperty(supabase, organizationId, input.property_code);
      if (!property) return { error: `Unknown property_code ${input.property_code}` };

      let roomTypeId: string | null = null;
      if (input.room_type_code) {
        const rt = await findRoomType(supabase, property.id, input.room_type_code);
        roomTypeId = rt?.id ?? null;
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const { data, error } = await supabase
        .from("quotations")
        .insert({
          organization_id: organizationId,
          property_id: property.id,
          lead_id: ctx.leadId,
          guest_id: ctx.guestId,
          arrival_date: input.arrival_date,
          departure_date: input.departure_date,
          room_type_id: roomTypeId,
          meal_plan: input.meal_plan ?? null,
          accommodation_amount: input.accommodation_amount ?? 0,
          dive_amount: input.dive_amount ?? 0,
          transfer_amount: input.transfer_amount ?? 0,
          discount_amount: input.discount_amount ?? 0,
          currency: input.currency,
          expiry_date: expiryDate.toISOString().slice(0, 10),
          terms: input.notes ?? null,
          status: "draft",
        })
        .select("id, quotation_number, total_amount, currency")
        .single();
      if (error) return { error: error.message };

      effects.quotationId = data.id;
      effects.quotationNumber = data.quotation_number;
      effects.quotationTotal = data.total_amount;
      effects.quotationCurrency = data.currency;

      await recordAiAction(supabase, organizationId, "quotation", data.id, "created", { quotation_number: data.quotation_number, total_amount: data.total_amount });

      return { quotation_number: data.quotation_number, total_amount: data.total_amount, currency: data.currency };
    }
    case "send_quotation": {
      const { data: quotation } = await supabase
        .from("quotations")
        .select("id, status, total_amount, currency, arrival_date, departure_date, meal_plan")
        .eq("organization_id", organizationId)
        .eq("quotation_number", input.quotation_number)
        .maybeSingle();
      if (!quotation) return { error: `No quotation found with number ${input.quotation_number}` };

      if (quotation.status === "draft") {
        // Brand new — never sent before. Level 2: gate for staff approval.
        effects.quotationId = quotation.id;
        effects.quotationNumber = input.quotation_number;
        effects.quotationTotal = quotation.total_amount;
        effects.quotationCurrency = quotation.currency;
        effects.sendGated = true;
        return { queued_for_approval: true, message: "New quotation — queued for staff approval before it can be sent." };
      }

      // Already sent before — Level 3, safe to actually resend.
      const summary =
        `Here's your quotation ${input.quotation_number}: ${quotation.currency} ${quotation.total_amount} total` +
        (quotation.arrival_date ? ` for ${quotation.arrival_date} → ${quotation.departure_date}` : "") +
        (quotation.meal_plan ? `, ${quotation.meal_plan}` : "") +
        ".";
      const sendResult =
        ctx.channel === "whatsapp" ? await sendWhatsAppMessage(ctx.contactAddress, summary) : await sendEmail(ctx.contactAddress, "Your quotation", summary);

      if (sendResult.sent) {
        await supabase.from("communications").insert({
          organization_id: organizationId,
          guest_id: ctx.guestId,
          lead_id: ctx.leadId,
          channel: ctx.channel,
          direction: "outbound",
          message: summary,
        });
        effects.quotationId = quotation.id;
        effects.quotationNumber = input.quotation_number;
        effects.quotationTotal = quotation.total_amount;
        effects.quotationCurrency = quotation.currency;
        effects.autoSentQuotation = true;
        await recordAiAction(supabase, organizationId, "quotation", quotation.id, "resent", { quotation_number: input.quotation_number });
      }

      return sendResult.sent
        ? { sent: true, message: "Existing quotation resent to the guest." }
        : { sent: false, reason: sendResult.reason, message: "Could not resend automatically — tell the guest a team member will follow up with it." };
    }
    case "create_booking": {
      const { data: quotation } = await supabase
        .from("quotations")
        .select("id, status, total_amount, currency, quotation_number")
        .eq("organization_id", organizationId)
        .eq("quotation_number", input.quotation_number)
        .maybeSingle();
      if (!quotation) return { error: `No quotation found with number ${input.quotation_number}` };

      // Always human-only: never creates a reservation, only flags the intent.
      await supabase.from("quotations").update({ status: "accepted" }).eq("id", quotation.id).in("status", ["sent", "viewed"]);

      const { data: staff } = await supabase.from("profiles").select("id").eq("organization_id", organizationId).eq("is_org_admin", true);
      if (staff && staff.length > 0) {
        await supabase.from("notifications").insert(
          staff.map((s) => ({
            user_id: s.id,
            organization_id: organizationId,
            type: "booking_new" as const,
            title: "Guest wants to confirm a booking",
            message: `Quotation ${quotation.quotation_number} (${quotation.currency} ${quotation.total_amount}) — guest asked to proceed. Confirm and convert to a booking.`,
            link: `/quotations/${quotation.id}`,
          }))
        );
      }

      effects.bookingRequested = true;
      await recordAiAction(supabase, organizationId, "quotation", quotation.id, "booking_requested", { quotation_number: quotation.quotation_number });

      return { requires_staff_confirmation: true, message: "Flagged for staff confirmation. This is never confirmed automatically." };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

async function recordAiAction(
  supabase: ServiceClient,
  organizationId: string,
  entityType: string,
  entityId: string,
  action: "created" | "resent" | "booking_requested",
  detail: Record<string, unknown>
) {
  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    user_id: null,
    application: "pixel_ai",
    entity_type: entityType,
    entity_id: entityId,
    action: action === "created" ? "created" : "status_changed",
    new_value: { ai_action: action, ...detail },
  });
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
  const effects: SideEffects = {
    quotationId: null,
    quotationNumber: null,
    quotationTotal: null,
    quotationCurrency: null,
    sendGated: false,
    autoSentQuotation: false,
    bookingRequested: false,
  };
  const ctx: ToolContext = {
    supabase,
    organizationId: input.organizationId,
    leadId: input.leadId,
    guestId: input.guestId,
    channel: input.channel,
    contactAddress: input.contactAddress,
  };

  const historyText = (input.priorMessages ?? []).map((m) => `[${m.direction}] ${m.message}`).join("\n");
  const quotationsText = (input.existingQuotations ?? [])
    .map((q) => `${q.quotation_number} (${q.status}): ${q.currency} ${q.total_amount}${q.arrival_date ? `, ${q.arrival_date} → ${q.departure_date}` : ""}`)
    .join("\n");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        (historyText ? `Prior conversation on this thread:\n${historyText}\n\n` : "") +
        (quotationsText ? `Existing quotations on file for this guest:\n${quotationsText}\n\n` : "") +
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
      const result = await executeTool(ctx, toolUse.name, toolUse.input, effects);
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
      needsMoreInfo: parsed.needs_more_info,
      confidence: parsed.confidence,
      escalate: parsed.escalate,
      escalationReason: parsed.escalation_reason,
      toolLog,
      modelUsed: MODEL,
      ...effects,
    };
  }

  return {
    intent: "other",
    replyDraft: finalText || "The assistant could not generate a reply. Please respond to this guest manually.",
    needsMoreInfo: ["Agent response could not be parsed — please review and draft a reply manually."],
    confidence: "low",
    escalate: true,
    escalationReason: "Agent output did not match the expected format.",
    toolLog,
    modelUsed: MODEL,
    ...effects,
  };
}
