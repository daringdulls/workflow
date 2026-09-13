import { createClient } from "@/lib/supabase/server";
import type { Profile, Property } from "@/lib/database.types";

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile | null;
  properties: Property[];
}

/**
 * Loads the signed-in user's profile plus the properties they can access
 * (all properties in their org if they're an admin, otherwise only granted ones).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  let properties: Property[] = [];
  if (profile?.organization_id) {
    if (profile.is_org_admin) {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("name");
      properties = data ?? [];
    } else {
      const { data } = await supabase
        .from("user_property_access")
        .select("properties(*)")
        .eq("user_id", user.id);
      properties = (data ?? []).flatMap((r: any) => (r.properties ? [r.properties as Property] : []));
    }
  }

  return { id: user.id, email: user.email ?? "", profile: profile ?? null, properties };
}
