"use client";

import { mutateApi, navigateAfterMutation } from "@/lib/api/browser";
import { ApiError } from "@/lib/api/errors";
import { registerSchema } from "./schema";

export type AuthActionState = {
  ok: boolean;
  fieldErrors?: { email?: string[]; password?: string[] };
  formError?: string;
};

async function submitAuth(path: string, destination: string, formData: FormData): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await mutateApi(path, "POST", parsed.data);
    navigateAfterMutation(destination);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      fieldErrors: error instanceof ApiError ? error.problem.errors : undefined,
      formError: error instanceof Error ? error.message : "Não foi possível concluir a operação.",
    };
  }
}

export async function registerAction(_previous: AuthActionState, formData: FormData) {
  return submitAuth("/api/auth/register", "/login?registered=1", formData);
}

export async function loginAction(_previous: AuthActionState, formData: FormData) {
  return submitAuth("/api/auth/login", "/dashboard", formData);
}
