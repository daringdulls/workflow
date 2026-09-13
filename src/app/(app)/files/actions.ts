"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordAudit } from "@/lib/audit";

export async function uploadFile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile?.organization_id) throw new Error("No organization assigned.");
  const supabase = createClient();
  const orgId = user.profile.organization_id;

  const file = formData.get("file") as File | null;
  const relatedType = String(formData.get("related_type") ?? "").trim();
  const relatedId = String(formData.get("related_id") ?? "").trim();
  const fileType = String(formData.get("file_type") ?? "other").trim();

  if (!file || file.size === 0) throw new Error("Choose a file to upload.");
  if (!relatedType || !relatedId) throw new Error("Related type and ID are required.");

  const path = `${orgId}/${relatedType}/${relatedId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("pixel-files").upload(path, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("files").insert({
    organization_id: orgId,
    related_type: relatedType,
    related_id: relatedId,
    file_type: fileType,
    file_name: file.name,
    storage_path: path,
    uploaded_by: user.id,
  });
  if (insertError) throw new Error(insertError.message);

  await recordAudit({
    organizationId: orgId,
    userId: user.id,
    entityType: "file",
    entityId: relatedId,
    action: "created",
    newValue: { file_name: file.name, related_type: relatedType, file_type: fileType },
  });

  revalidatePath("/files");
}

export async function getFileUrl(storagePath: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("pixel-files").createSignedUrl(storagePath, 60 * 5);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
