"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

export async function updateOrganization(orgId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.is_org_admin) {
    throw new Error("Only a Company Admin can update organization settings.");
  }

  const supabase = createClient();
  const { data: before } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();

  const updates = {
    name: String(formData.get("name") ?? "").trim(),
    status: String(formData.get("status") ?? "active") as "active" | "inactive",
  };

  const { error } = await supabase.from("organizations").update(updates).eq("id", orgId);
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: orgId,
    userId: user.id,
    entityType: "organization",
    entityId: orgId,
    action: "updated",
    oldValue: before,
    newValue: updates,
  });

  revalidatePath(`/organizations/${orgId}`);
  redirect(`/organizations/${orgId}`);
}
