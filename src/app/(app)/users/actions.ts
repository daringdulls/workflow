"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.profile?.is_org_admin || !user.profile.organization_id) {
    throw new Error("Only a Company Admin can manage users.");
  }
  return { userId: user.id, organizationId: user.profile.organization_id };
}

export async function inviteUser(formData: FormData) {
  const { userId, organizationId } = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const jobTitle = String(formData.get("job_title") ?? "").trim() || null;
  const department = String(formData.get("department") ?? "").trim() || null;
  const roleId = String(formData.get("role_id") ?? "") || null;
  const isOrgAdmin = formData.get("is_org_admin") === "on";

  const admin = createServiceClient();
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { first_name: firstName, last_name: lastName },
  });
  if (error || !invited.user) {
    throw new Error(error?.message ?? "Could not invite user.");
  }

  const supabase = createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      organization_id: organizationId,
      first_name: firstName,
      last_name: lastName,
      job_title: jobTitle,
      department,
      role_id: roleId,
      is_org_admin: isOrgAdmin,
    })
    .eq("id", invited.user.id);
  if (profileError) throw new Error(profileError.message);

  const propertyIds = formData.getAll("property_ids").map(String);
  if (propertyIds.length > 0) {
    await supabase.from("user_property_access").insert(propertyIds.map((property_id) => ({ user_id: invited.user!.id, property_id })));
  }

  await recordAudit({
    organizationId,
    userId,
    entityType: "user",
    entityId: invited.user.id,
    action: "created",
    newValue: { email, firstName, lastName, roleId, isOrgAdmin },
  });

  revalidatePath("/users");
  redirect(`/users/${invited.user.id}`);
}

export async function updateUser(profileId: string, formData: FormData) {
  const { userId, organizationId } = await requireAdmin();
  const supabase = createClient();

  const { data: before } = await supabase.from("profiles").select("*").eq("id", profileId).maybeSingle();

  const updates = {
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    job_title: String(formData.get("job_title") ?? "").trim() || null,
    department: String(formData.get("department") ?? "").trim() || null,
    role_id: String(formData.get("role_id") ?? "") || null,
    status: String(formData.get("status") ?? "active") as "active" | "inactive" | "suspended",
    is_org_admin: formData.get("is_org_admin") === "on",
  };

  const { error } = await supabase.from("profiles").update(updates).eq("id", profileId);
  if (error) throw new Error(error.message);

  const propertyIds = formData.getAll("property_ids").map(String);
  await supabase.from("user_property_access").delete().eq("user_id", profileId);
  if (propertyIds.length > 0) {
    await supabase.from("user_property_access").insert(propertyIds.map((property_id) => ({ user_id: profileId, property_id })));
  }

  await recordAudit({
    organizationId,
    userId,
    entityType: "user",
    entityId: profileId,
    action: updates.status !== before?.status ? "status_changed" : "updated",
    oldValue: before,
    newValue: updates,
  });

  revalidatePath(`/users/${profileId}`);
  revalidatePath("/users");
  redirect(`/users/${profileId}`);
}
