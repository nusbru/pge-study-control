"use client";

import { useActionState } from "react";
import { mutateApi, navigateAfterMutation } from "@/lib/api/browser";
import { ApiError } from "@/lib/api/errors";

export function SignOutForm({ className }: Readonly<{ className?: string }>) {
  const [error, action, pending] = useActionState(async () => {
    try {
      await mutateApi("/api/auth/logout", "POST");
      navigateAfterMutation("/login");
      return "";
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigateAfterMutation("/login");
        return "";
      }
      return error instanceof Error ? error.message : "Não foi possível sair.";
    }
  }, "");
  return (
    <form className={className} action={action}>
      <button type="submit" disabled={pending}>{pending ? "Saindo..." : "Sair"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
