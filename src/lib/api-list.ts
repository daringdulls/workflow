import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAnyApiKey } from "@/lib/webhook-auth";

/**
 * Shared GET (list) handler for /api/v1/* resources. Authenticates with any
 * configured Pixel app secret, then returns a paginated, newest-first list.
 * Optional `organization_slug` query param scopes results to one org.
 */
export function listHandler(table: string, opts?: { orgScoped?: boolean; orderBy?: string }) {
  return async function GET(request: NextRequest) {
    const appKey = verifyAnyApiKey(request);
    if (!appKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceClient();
    const { searchParams } = request.nextUrl;
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
    const offset = Number(searchParams.get("offset") ?? 0);

    let query = supabase
      .from(table)
      .select("*", { count: "exact" })
      .order(opts?.orderBy ?? "created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (opts?.orgScoped !== false) {
      const orgSlug = searchParams.get("organization_slug");
      if (orgSlug) {
        const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
        if (!org) return NextResponse.json({ data: [], count: 0 });
        query = query.eq("organization_id", org.id);
      }
    }

    const { data, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, count, limit, offset });
  };
}
