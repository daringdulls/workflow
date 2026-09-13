"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function retryFailedEvents(appKey: string) {
  const supabase = createClient();
  const { data: failed } = await supabase.from("events").select("id, retry_count").eq("source_app", appKey).eq("status", "failed");

  for (const e of failed ?? []) {
    await supabase.from("events").update({ status: "pending", retry_count: e.retry_count + 1 }).eq("id", e.id);
  }

  await supabase.from("sync_logs").insert({
    app_key: appKey,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    records_received: 0,
    records_sent: failed?.length ?? 0,
    failed_records: 0,
    status: "synced",
    details: { retried: failed?.length ?? 0 },
  });

  revalidatePath("/integrations/sync");
}
