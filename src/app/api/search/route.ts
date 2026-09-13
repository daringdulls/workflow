import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ groups: [] });
  }

  const supabase = createClient();
  const like = `%${q}%`;

  const [guests, reservations, properties, agents, quotations] = await Promise.all([
    supabase
      .from("guests")
      .select("id, guest_number, first_name, last_name, email, phone")
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like},guest_number.ilike.${like}`)
      .limit(5),
    supabase
      .from("reservations")
      .select("id, booking_number, external_booking_id")
      .or(`booking_number.ilike.${like},external_booking_id.ilike.${like}`)
      .limit(5),
    supabase.from("properties").select("id, name, code").or(`name.ilike.${like},code.ilike.${like}`).limit(5),
    supabase.from("agents").select("id, company_name, agent_code").or(`company_name.ilike.${like},agent_code.ilike.${like}`).limit(5),
    supabase.from("quotations").select("id, quotation_number").ilike("quotation_number", like).limit(5),
  ]);

  const groups = [
    {
      label: "Guests",
      results: (guests.data ?? []).map((g) => ({
        id: g.id,
        title: `${g.first_name} ${g.last_name}`,
        subtitle: [g.guest_number, g.email, g.phone].filter(Boolean).join(" · "),
        href: `/guests/${g.id}`,
      })),
    },
    {
      label: "Reservations",
      results: (reservations.data ?? []).map((r) => ({
        id: r.id,
        title: r.booking_number,
        subtitle: r.external_booking_id ?? "",
        href: `/reservations/${r.id}`,
      })),
    },
    {
      label: "Properties",
      results: (properties.data ?? []).map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: p.code,
        href: `/properties/${p.id}`,
      })),
    },
    {
      label: "Agents",
      results: (agents.data ?? []).map((a) => ({
        id: a.id,
        title: a.company_name,
        subtitle: a.agent_code,
        href: `/agents/${a.id}`,
      })),
    },
    {
      label: "Quotations",
      results: (quotations.data ?? []).map((q) => ({
        id: q.id,
        title: q.quotation_number,
        subtitle: "",
        href: `/quotations/${q.id}`,
      })),
    },
  ].filter((g) => g.results.length > 0);

  return NextResponse.json({ groups });
}
