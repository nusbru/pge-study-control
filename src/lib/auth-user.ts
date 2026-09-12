import { redirect } from "next/navigation";
import { serverApi } from "./api/server";
import { ApiError } from "./api/errors";
import type { CurrentUser } from "./api/contracts";

export async function getCurrentUser() {
  try {
    return await serverApi<CurrentUser>("/api/auth/me", true);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function requireUserId() {
  const user = await getCurrentUser();
  const userId = user?.id;
  if (typeof userId !== "string" || userId.length === 0) redirect("/login");
  return userId;
}
