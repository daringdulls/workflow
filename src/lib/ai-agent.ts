import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { createServiceClient } from "@/lib/supabase/server";
import type { SuggestedQuotation } from "@/lib/database.types";

type ServiceClient = ReturnType<typeof createServiceClient>;

const MODEL = "claude-opus-5";

const FinalAnswerSchema = z.object({
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
}

export interface AgentResult {
  replyDraft: string;
  suggestedQuotation: SuggestedQuotation | null;
  needsMoreInfo: string[];
  confidence: string;
  toolLog: AgentToolLogEntry[];
  modelUsed: string;
}

const SYSTEM_PROMPT = `You are the Pixel AI reservations assistant for a hospitality group on Pixel Core. \
A guest inquiry has come in over WhatsApp or email. Your job is to draft a warm, professional, \
accurate reply that a staff member will review before it is sent — you never send anything yourself.

Ground every fact in tool results. Never invent availability, prices, room types, or property names. \
Always call check_availability and get_rates before including any price or availability claim. \
If a property or room type isn't clear from the message, call list_properties / list_room_types first.

If you don't have enough information to check availability or pricing (missing dates, property, or \
guest count), do not guess — ask a clarifying question in guest_reply and list what's missing in \
needs_more_info instead of fabricating a quote.

Keep guest_reply concise, friendly, and ready to send with only minor edits. Do not promise a \
confirmed booking — a quote is not a reservation until staff follow up.

End your final turn with exactly one fenced json code block matching this shape (quote is null when \
you don't have enough grounded information for one):

\`\`\`json
{
  "guest_reply": "string",
  "quote": {
    "property_code": "string",
    "room_type_code": "string or null",
    "arrival_date": "YYYY-MM-DD",
    "departure_date": "YYYY-MM-DD",
    "meal_plan": "string or null",
    "currency": "string",
    "accommodation_amount": 0,
    "notes": "string or null"
  } | null,
  "needs_more_info": ["string"],
  "confidence": "high" | "medium" | "low"
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
        "Returns per-room-type available room counts for each night.",
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
      name: "get_rates",
      description:
        "Get active public rates and promotions for a property (optionally a specific room type) " +
        "covering a date range, including meal plan, currency, amount and cancellation policy.",
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
  ];
}

async function executeTool(
  supabase: ServiceClient,
  organizationId: string,
  name: string,
  input: any
): Promise<unknown> {
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
      const { data: property } = await supabase
        .from("properties")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("code", input.property_code)
        .maybeSingle();
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
      const { data: property } = await supabase
        .from("properties")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("code", input.property_code)
        .maybeSingle();
      if (!property) return { error: `Unknown property_code ${input.property_code}` };

      let roomTypeIds: string[] | null = null;
      if (input.room_type_code) {
        const { data: rt } = await supabase
          .from("room_types")
          .select("id")
          .eq("property_id", property.id)
          .eq("code", input.room_type_code)
          .maybeSingle();
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
        return {
          note: "No pre-calculated availability found for this range. Advise the guest that availability will be confirmed, and set confidence to medium or low.",
        };
      }

      const byRoomType = new Map<string, { room_type: string; min_available: number; nights_checked: number }>();
      for (const row of data as any[]) {
        const key = row.room_types?.code ?? row.room_type_id;
        const label = row.room_types?.name ?? key;
        const existing = byRoomType.get(key);
        if (!existing) {
          byRoomType.set(key, { room_type: label, min_available: row.available_rooms, nights_checked: 1 });
        } else {
          existing.min_available = Math.min(existing.min_available, row.available_rooms);
          existing.nights_checked += 1;
        }
      }
      return Array.from(byRoomType.values());
    }
    case "get_rates": {
      const { data: property } = await supabase
        .from("properties")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("code", input.property_code)
        .maybeSingle();
      if (!property) return { error: `Unknown property_code ${input.property_code}` };

      let roomTypeId: string | null = null;
      if (input.room_type_code) {
        const { data: rt } = await supabase
          .from("room_types")
          .select("id")
          .eq("property_id", property.id)
          .eq("code", input.room_type_code)
          .maybeSingle();
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
    default:
      return { error: `Unknown tool ${name}` };
  }
}

function extractFinalAnswer(text: string): z.infer<typeof FinalAnswerSchema> | null {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return FinalAnswerSchema.parse(parsed);
  } catch {
    return null;
  }
}

export async function runInquiryAgent(input: AgentInput, supabase: ServiceClient): Promise<AgentResult> {
  const client = new Anthropic();
  const toolLog: AgentToolLogEntry[] = [];

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Channel: ${input.channel}\nGuest name: ${input.guestName ?? "unknown"}\nContact: ${input.contactAddress}\n\nMessage:\n${input.message}`,
    },
  ];

  let finalText = "";
  for (let iteration = 0; iteration < 6; iteration++) {
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
      replyDraft: parsed.guest_reply,
      suggestedQuotation: parsed.quote,
      needsMoreInfo: parsed.needs_more_info,
      confidence: parsed.confidence,
      toolLog,
      modelUsed: MODEL,
    };
  }

  return {
    replyDraft: finalText || "The assistant could not generate a reply. Please respond to this guest manually.",
    suggestedQuotation: null,
    needsMoreInfo: ["Agent response could not be parsed — please review and draft a reply manually."],
    confidence: "low",
    toolLog,
    modelUsed: MODEL,
  };
}
