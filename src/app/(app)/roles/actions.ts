"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

export async function updateRolePermissions(roleId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.is_org_admin) {
    throw new Error("Only a Company Admin can manage roles & permissions.");
  }

  const supabase = createClient();
  const permissionIds = formData.getAll("permission_ids").map(String);

  await supabase.from("role_permissions").delete().eq("role_id", roleId);
  if (permissionIds.length > 0) {
    await supabase.from("role_permissions").insert(permissionIds.map((permission_id) => ({ role_id: roleId, permission_id })));
  }

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "role",
    entityId: roleId,
    action: "permission_changed",
    newValue: { permissionIds },
  });

  revalidatePath(`/roles/${roleId}`);
}
