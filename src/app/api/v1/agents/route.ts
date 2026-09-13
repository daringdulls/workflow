import { listHandler } from "@/lib/api-list";

export const GET = listHandler("agents", { orderBy: "company_name" });
