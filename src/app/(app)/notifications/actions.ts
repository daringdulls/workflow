"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotification(id: string, status: "read" | "dismissed") {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ status, read_at: status === "read" ? new Date().toISOString() : undefined })
    .eq("id", id);
  revalidatePath("/notifications");
}

export async function markAllRead(userId: string) {
  const supabase = createClient();
  await supabase.from("notifications").update({ status: "read", read_at: new Date().toISOString() }).eq("user_id", userId).eq("status", "unread");
  revalidatePath("/notifications");
}
