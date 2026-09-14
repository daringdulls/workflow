"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";
import type { AppConnectionStatus } from "@/lib/database.types";

export async function setConnectionStatus(appKey: string, status: AppConnectionStatus) {
  const user = await getCurrentUser();
  if (!user?.profile?.is_org_admin) throw new Error("Only a Company Admin can manage integrations.");
  const supabase = createClient();

  const { error } = await supabase.from("app_connections").update({ status }).eq("app_key", appKey);
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "app_connection",
    entityId: appKey,
    action: "status_changed",
    newValue: { status },
  });

  revalidatePath("/integrations/connections");
  revalidatePath(`/integrations/connections/${appKey}`);
}

export async function setAppUrl(appKey: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.is_org_admin) throw new Error("Only a Company Admin can manage integrations.");
  const supabase = createClient();

  const rawUrl = String(formData.get("app_url") ?? "").trim();
  const appUrl = rawUrl ? rawUrl : null;
  if (appUrl) {
    try {
      new URL(appUrl);
    } catch {
      throw new Error("Enter a full URL, e.g. https://your-app.vercel.app");
    }
  }

  const { error } = await supabase.from("app_connections").update({ app_url: appUrl }).eq("app_key", appKey);
  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId: user.profile.organization_id,
    userId: user.id,
    entityType: "app_connection",
    entityId: appKey,
    action: "updated",
    newValue: { app_url: appUrl },
  });

  revalidatePath("/integrations/connections");
  revalidatePath(`/integrations/connections/${appKey}`);
}
