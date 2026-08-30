import { redirect } from "next/navigation";
import { getPosSession } from "@/lib/pos/auth";

const ROLE_HOME: Record<string, string> = {
  kitchen: "/pos/kitchen",
  bar: "/pos/kitchen",
  waiter: "/pos/order",
  cashier: "/pos/order",
  inventory: "/pos/inventory",
  accountant: "/pos/reports",
};

export default async function PosRoot() {
  const session = await getPosSession();
  if (!session) redirect("/pos/login");
  redirect(ROLE_HOME[session.role] ?? "/pos/dashboard");
}
