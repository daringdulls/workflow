import { createClient } from "@/lib/supabase/server";
import type { AuditAction, Json } from "@/lib/database.types";

export async function recordAudit(params: {
  organizationId: string | null;
  userId: string | null;
  application?: string;
  entityType: string;
  entityId?: string | null;
  action: AuditAction;
  oldValue?: Json;
  newValue?: Json;
}) {
  const supabase = createClient();
  await supabase.from("audit_logs").insert({
    organization_id: params.organizationId,
    user_id: params.userId,
    application: params.application ?? "pixel_core",
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    action: params.action,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
  });
}
