"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

export async function createGuest(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const organizationId = user.profile.organization_id;

  const payload = {
    organization_id: organizationId,
    title: String(formData.get("title") ?? "").trim() || null,
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    gender: String(formData.get("gender") ?? "").trim() || null,
    date_of_birth: String(formData.get("date_of_birth") ?? "") || null,
    nationality: String(formData.get("nationality") ?? "").trim() || null,
    passport_number: String(formData.get("passport_number") ?? "").trim() || null,
    passport_expiry: String(formData.get("passport_expiry") ?? "") || null,
    email: String(formData.get("email") ?? "").trim().toLowerCase() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    country: String(formData.get("country") ?? "").trim() || null,
    preferred_language: String(formData.get("preferred_language") ?? "").trim() || null,
    vip_status: formData.get("vip_status") === "on",
    dietary_requirements: String(formData.get("dietary_requirements") ?? "").trim() || null,
    special_requirements: String(formData.get("special_requirements") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.id,
    updated_by: user.id,
  };

  // Duplicate detection: email, phone, passport, or exact name match within the org.
  const orFilters = [
    payload.email ? `email.eq.${payload.email}` : null,
    payload.phone ? `phone.eq.${payload.phone}` : null,
    payload.passport_number ? `passport_number.eq.${payload.passport_number}` : null,
  ].filter(Boolean);

  let duplicateId: string | null = null;
  if (orFilters.length > 0) {
    const { data: dup } = await supabase
      .from("guests")
      .select("id")
      .eq("organization_id", organizationId)
      .or(orFilters.join(","))
      .limit(1)
      .maybeSingle();
    duplicateId = dup?.id ?? null;
  }

  const { data, error } = await supabase.from("guests").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId,
    userId: user.id,
    entityType: "guest",
    entityId: data.id,
    action: "created",
    newValue: payload,
  });

  revalidatePath("/guests");
  redirect(`/guests/${data.id}${duplicateId ? `?duplicateOf=${duplicateId}` : ""}`);
}

export async function updateGuest(guestId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();

  const { data: before } = await supabase.from("guests").select("*").eq("id", guestId).maybeSingle();

  const updates = {
    title: String(formData.get("title") ?? "").trim() || null,
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    gender: String(formData.get("gender") ?? "").trim() || null,
    date_of_birth: String(formData.get("date_of_birth") ?? "") || null,
    nationality: String(formData.get("nationality") ?? "").trim() || null,
    passport_number: String(formData.get("passport_number") ?? "").trim() || null,
    passport_expiry: String(formData.get("passport_expiry") ?? "") || null,
    email: String(formData.get("email") ?? "").trim().toLowerCase() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    country: String(formData.get("country") ?? "").trim() || null,
    preferred_language: String(formData.get("preferred_language") ?? "").trim() || null,
    vip_status: formData.get("vip_status") === "on",
    dietary_requirements: String(formData.get("dietary_requirements") ?? "").trim() || null,
    special_requirements: String(formData.get("special_requirements") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    updated_by: user.id,
  };

  const { error } = await supabase.from("guests").update(updates).eq("id", guestId);
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "guest",
    entityId: guestId,
    action: "updated",
    oldValue: before,
    newValue: updates,
  });

  revalidatePath(`/guests/${guestId}`);
  redirect(`/guests/${guestId}`);
}

export async function addCommunication(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();

  const guestId = String(formData.get("guest_id") ?? "");
  const payload = {
    organization_id: user.profile.organization_id,
    guest_id: guestId || null,
    lead_id: String(formData.get("lead_id") ?? "") || null,
    channel: String(formData.get("channel") ?? "internal_note") as any,
    direction: String(formData.get("direction") ?? "internal") as any,
    subject: String(formData.get("subject") ?? "").trim() || null,
    message: String(formData.get("message") ?? "").trim(),
    created_by: user.id,
  };

  const { error } = await supabase.from("communications").insert(payload);
  if (error) throw new Error(error.message);

  if (guestId) revalidatePath(`/guests/${guestId}`);
  revalidatePath("/communications");
}
