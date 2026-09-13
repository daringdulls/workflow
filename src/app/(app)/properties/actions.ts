"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

function requireAdmin(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user?.profile?.is_org_admin || !user.profile.organization_id) {
    throw new Error("Only a Company Admin can manage properties.");
  }
  return { userId: user.id, organizationId: user.profile.organization_id };
}

export async function createProperty(formData: FormData) {
  const user = await getCurrentUser();
  const { userId, organizationId } = requireAdmin(user);
  const supabase = createClient();

  const payload = {
    organization_id: organizationId,
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    country: String(formData.get("country") ?? "").trim() || null,
    currency: String(formData.get("currency") ?? "USD").trim().toUpperCase(),
    status: "active" as const,
  };

  const { data, error } = await supabase.from("properties").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId,
    userId,
    entityType: "property",
    entityId: data.id,
    action: "created",
    newValue: payload,
  });

  revalidatePath("/properties");
  redirect(`/properties/${data.id}`);
}

export async function updateProperty(propertyId: string, formData: FormData) {
  const user = await getCurrentUser();
  const { userId, organizationId } = requireAdmin(user);
  const supabase = createClient();

  const { data: before } = await supabase.from("properties").select("*").eq("id", propertyId).maybeSingle();

  const updates = {
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    country: String(formData.get("country") ?? "").trim() || null,
    currency: String(formData.get("currency") ?? "USD").trim().toUpperCase(),
    status: String(formData.get("status") ?? "active") as "active" | "inactive",
  };

  const { error } = await supabase.from("properties").update(updates).eq("id", propertyId);
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId,
    userId,
    entityType: "property",
    entityId: propertyId,
    action: updates.status !== before?.status ? "status_changed" : "updated",
    oldValue: before,
    newValue: updates,
  });

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  redirect(`/properties/${propertyId}`);
}
