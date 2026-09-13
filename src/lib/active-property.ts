import { cookies } from "next/headers";
import { ACTIVE_PROPERTY_COOKIE } from "@/lib/cookies";
import type { Property } from "@/lib/database.types";

/** Reads the active property cookie, falling back to "all properties" (null). */
export function getActivePropertyId(properties: Property[]): string | null {
  const value = cookies().get(ACTIVE_PROPERTY_COOKIE)?.value ?? null;
  if (value && properties.some((p) => p.id === value)) return value;
  return null;
}
