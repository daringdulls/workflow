import { listHandler } from "@/lib/api-list";

export const GET = listHandler("availability_daily", { orgScoped: false, orderBy: "date" });
