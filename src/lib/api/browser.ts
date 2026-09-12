"use client";

import { ApiError, responseError } from "./errors";

export async function mutateApi<T = void>(path: string, method: string, body?: unknown): Promise<T> {
  try {
    // A fresh request token is bound to the current identity, including after login/logout.
    const csrf = await fetch("/api/auth/csrf", { credentials: "same-origin", cache: "no-store" });
    if (!csrf.ok) throw await responseError(csrf);
    const { token } = await csrf.json() as { token: string };
    const response = await fetch(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": token },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 401 && !path.startsWith("/api/auth/")) navigateAfterMutation("/login");
    if (!response.ok) throw await responseError(response);
    return response.status === 204 ? undefined as T : await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, { title: "Não foi possível conectar ao servidor. Tente novamente." });
  }
}

export function navigateAfterMutation(path: string) {
  // A document navigation clears prefetched private pages after account or data changes.
  window.location.assign(path);
}
