import { serverApi } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import type { MockExamPage, MockExamResponse, MockExamPerformance } from "@/lib/api/contracts";

export function listMockExams(page: number) {
  return serverApi<MockExamPage>(`/api/mock-exams?page=${page}`);
}

export async function getMockExam(id: string) {
  try {
    return await serverApi<MockExamResponse>(`/api/mock-exams/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function getMockExamPerformance(period: string, today: string) {
  return serverApi<MockExamPerformance>(`/api/mock-exams/performance?${new URLSearchParams({ period, today })}`);
}
