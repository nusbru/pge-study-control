import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { responseError } from "./errors";

export async function serverApi<T>(path: string, allowAnonymous = false): Promise<T> {
  const cookieStore = await cookies();
  // Only the Identity cookie belongs to the backend. Never forward unrelated site cookies.
  const identity = cookieStore.get("pge.identity");
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:5080"}${path}`, {
    headers: identity ? { Cookie: `pge.identity=${identity.value}` } : {},
    cache: "no-store",
  });
  if (response.status === 401 && !allowAnonymous) redirect("/login");
  if (!response.ok) throw await responseError(response);
  return response.json() as Promise<T>;
}
