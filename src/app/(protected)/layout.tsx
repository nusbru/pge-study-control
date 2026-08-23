import type { ReactNode } from "react";
import { requireUserId } from "@/lib/auth-user";

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireUserId();
  return children;
}
