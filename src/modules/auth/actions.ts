"use server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hashPassword } from "./password";
import { registerSchema } from "./schema";

type AuthFieldErrors = {
  email?: string[];
  password?: string[];
};

export type AuthActionState = {
  ok: boolean;
  fieldErrors?: AuthFieldErrors;
  formError?: string;
};

export async function registerUser(input: unknown): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        ok: false,
        fieldErrors: { email: ["Este e-mail já está cadastrado."] },
      };
    }

    console.error("Falha ao cadastrar usuário.", error);
    return {
      ok: false,
      formError: "Não foi possível criar a conta. Tente novamente.",
    };
  }
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = await registerUser({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (result.ok) redirect("/login?registered=1");
  return result;
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { signIn } = await import("@/auth");

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return { ok: true };
  } catch (error) {
    const { AuthError } = await import("next-auth");
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { ok: false, formError: "E-mail ou senha inválidos." };
      }

      console.error("Falha ao autenticar usuário.", error);
      return { ok: false, formError: "Não foi possível entrar. Tente novamente." };
    }

    throw error;
  }
}
