"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth-user";
import { studySessionInputSchema } from "./schema";
import { createSession, deleteSession, updateSession } from "./repository";

export type SessionActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  formError?: string;
  values?: Record<string, string>;
};

export async function createSessionAction(
  _previous: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  void _previous;
  const userId = await requireUserId();
  const values = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = studySessionInputSchema.safeParse(values);
  if (!parsed.success) {
    return {
      values,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.issues[0]?.message,
    };
  }

  try {
    await createSession(userId, parsed.data);
  } catch (error) {
    console.error("Failed to create study session", error);
    return { values, formError: "Não foi possível salvar a sessão. Tente novamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/sessions");
  redirect("/sessions");
}

export async function updateSessionAction(
  id: string,
  _previous: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  void _previous;
  const userId = await requireUserId();
  const values = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = studySessionInputSchema.safeParse(values);
  if (!parsed.success) {
    return {
      values,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.issues[0]?.message,
    };
  }

  try {
    const session = await updateSession(userId, id, parsed.data);
    if (!session) return { values, formError: "Sessão não encontrada." };
  } catch (error) {
    console.error("Failed to update study session", error);
    return { values, formError: "Não foi possível salvar a sessão. Tente novamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/sessions");
  redirect("/sessions");
}

export async function deleteSessionAction(
  id: string,
  _previous: SessionActionState,
  _formData: FormData,
): Promise<SessionActionState> {
  void _previous;
  void _formData;
  const userId = await requireUserId();

  try {
    const deleted = await deleteSession(userId, id);
    if (!deleted) return { formError: "Sessão não encontrada." };
  } catch (error) {
    console.error("Failed to delete study session", error);
    return { formError: "Não foi possível excluir a sessão. Tente novamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/sessions");
  return {};
}
