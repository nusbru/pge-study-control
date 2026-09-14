"use client";

import { mutateApi, navigateAfterMutation } from "@/lib/api/browser";
import { ApiError } from "@/lib/api/errors";
import type { SessionRequest } from "@/lib/api/contracts";
import { studySessionInputSchema } from "./schema";

export type SessionActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  formError?: string;
  values?: Record<string, string>;
};

async function saveSession(id: string | undefined, formData: FormData): Promise<SessionActionState> {
  const values = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = studySessionInputSchema.safeParse(values);
  if (!parsed.success) return {
    values,
    fieldErrors: parsed.error.flatten().fieldErrors,
    formError: parsed.error.issues[0]?.message,
  };
  const body: SessionRequest = {
    studyDate: parsed.data.studyDate,
    subjectId: parsed.data.subjectId,
    questionType: parsed.data.questionType,
    totalQuestions: parsed.data.totalQuestions,
    correctAnswers: parsed.data.correctAnswers,
    wrongAnswers: parsed.data.wrongAnswers,
    questionListUrl: parsed.data.questionListUrl,
    wrongQuestionListUrl: parsed.data.wrongQuestionListUrl,
  };
  try {
    await mutateApi(id ? `/api/sessions/${encodeURIComponent(id)}` : "/api/sessions", id ? "PUT" : "POST", body);
    navigateAfterMutation("/sessions");
    return {};
  } catch (error) {
    return {
      values,
      fieldErrors: error instanceof ApiError ? error.problem.errors : undefined,
      formError: error instanceof Error ? error.message : "Não foi possível salvar a sessão.",
    };
  }
}

export async function createSessionAction(_previous: SessionActionState, formData: FormData) {
  return saveSession(undefined, formData);
}

export async function updateSessionAction(id: string, _previous: SessionActionState, formData: FormData) {
  return saveSession(id, formData);
}

export async function deleteSessionAction(id: string, _previous: SessionActionState, _formData: FormData): Promise<SessionActionState> {
  void _previous;
  void _formData;
  try {
    await mutateApi(`/api/sessions/${encodeURIComponent(id)}`, "DELETE");
    navigateAfterMutation(window.location.pathname + window.location.search);
    return {};
  } catch (error) {
    return { formError: error instanceof Error ? error.message : "Não foi possível excluir a sessão." };
  }
}
