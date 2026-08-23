import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (typeof userId !== "string" || userId.length === 0) redirect("/login");
  return userId;
}
