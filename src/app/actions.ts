"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTIVE_PROPERTY_COOKIE } from "@/lib/cookies";

export async function setActiveProperty(propertyId: string | null) {
  const store = cookies();
  if (propertyId) {
    store.set(ACTIVE_PROPERTY_COOKIE, propertyId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  } else {
    store.delete(ACTIVE_PROPERTY_COOKIE);
  }
  revalidatePath("/");
}
