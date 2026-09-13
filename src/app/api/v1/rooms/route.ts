import { listHandler } from "@/lib/api-list";

export const GET = listHandler("rooms", { orgScoped: false, orderBy: "room_number" });
