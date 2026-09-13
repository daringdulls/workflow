import { listHandler } from "@/lib/api-list";

export const GET = listHandler("properties", { orderBy: "name" });
