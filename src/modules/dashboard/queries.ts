import { serverApi } from "@/lib/api/server";
import type { DashboardData } from "@/lib/api/contracts";
import type { DashboardPeriod } from "./period";
import { serializeDashboardQuestionType, type DashboardQuestionType } from "./question-type-filter";

export type { DashboardData } from "@/lib/api/contracts";
export type DashboardSubject = DashboardData["subjects"][number];

export async function getDashboard(period: DashboardPeriod, today: string, questionType: DashboardQuestionType) {
  const params = new URLSearchParams({ period, today, questionType: serializeDashboardQuestionType(questionType) });
  return serverApi<DashboardData>(`/api/dashboard?${params}`);
}
