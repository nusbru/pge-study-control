import { serverApi } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import { sessionViewModel, type SessionResponse, type SessionPage, type SubjectResponse } from "@/lib/api/contracts";

export async function listSubjects() {
  return serverApi<SubjectResponse[]>("/api/subjects");
}

export async function getSession(id: string) {
  try {
    return sessionViewModel(await serverApi<SessionResponse>(`/api/sessions/${encodeURIComponent(id)}`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function listSessions(page: number, subjectId?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (subjectId) params.set("subjectId", subjectId);
  const result = await serverApi<SessionPage>(`/api/sessions?${params}`);
  return { records: result.records.map(sessionViewModel), totalPages: result.totalPages };
}
