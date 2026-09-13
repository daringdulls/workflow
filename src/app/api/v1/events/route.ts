import { listHandler } from "@/lib/api-list";

export const GET = listHandler("events", { orgScoped: false });
