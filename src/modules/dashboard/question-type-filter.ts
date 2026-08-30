import { QuestionType } from "@/generated/prisma/enums";

const fromParam = {
  jurisprudence: QuestionType.JURISPRUDENCE,
  "black-letter-law": QuestionType.BLACK_LETTER_LAW,
  doctrine: QuestionType.DOCTRINE,
  unspecified: QuestionType.UNSPECIFIED,
} as const;

export type DashboardQuestionType = QuestionType | "all";

export function parseDashboardQuestionType(value: unknown): DashboardQuestionType {
  if (value === "all") return "all";
  return typeof value === "string" && Object.hasOwn(fromParam, value)
    ? fromParam[value as keyof typeof fromParam]
    : "all";
}

export function serializeDashboardQuestionType(value: DashboardQuestionType): string {
  if (value === "all") return "all";
  return Object.entries(fromParam).find(([, questionType]) => questionType === value)![0];
}
