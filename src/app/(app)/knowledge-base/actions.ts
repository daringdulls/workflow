"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

function buildPayload(formData: FormData) {
  return {
    property_id: String(formData.get("property_id") ?? "") || null,
    category: String(formData.get("category") ?? "other") as any,
    title: String(formData.get("title") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
  };
}

export async function createArticle(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();

  const payload = { ...buildPayload(formData), organization_id: user.profile.organization_id, status: "active" as const, created_by: user.id, updated_by: user.id };
  const { data, error } = await supabase.from("knowledge_base_articles").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await recordAudit({ organizationId: user.profile.organization_id, userId: user.id, entityType: "knowledge_base_article", entityId: data.id, action: "created", newValue: payload });

  revalidatePath("/knowledge-base");
  redirect(`/knowledge-base/${data.id}`);
}

export async function updateArticle(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const { data: before } = await supabase.from("knowledge_base_articles").select("*").eq("id", id).maybeSingle();

  const updates = { ...buildPayload(formData), status: String(formData.get("status") ?? "active") as "active" | "inactive", updated_by: user.id };
  const { error } = await supabase.from("knowledge_base_articles").update(updates).eq("id", id);
  if (error) throw new Error(error.message);

  await recordAudit({ organizationId: user.profile.organization_id, userId: user.id, entityType: "knowledge_base_article", entityId: id, action: "updated", oldValue: before, newValue: updates });

  revalidatePath("/knowledge-base");
  redirect(`/knowledge-base/${id}`);
}
