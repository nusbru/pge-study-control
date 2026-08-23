import { z } from "zod";
import { normalizeSubject, resolveQuestionCounts } from "./domain";

const optionalCount = z.preprocess(
  (value) => value === "" || value === null ? undefined : typeof value === "string" ? Number(value) : value,
  z.number().int().min(0).max(1_000_000).optional(),
);

const optionalHttpUrl = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.string().max(2_048).refine((value) => {
    try { return ["http:", "https:"].includes(new URL(value).protocol); }
    catch { return false; }
  }, "Informe uma URL HTTP ou HTTPS válida.").nullable(),
);

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const rawStudySessionSchema = z.object({
  studyDate: z.string().refine(isCalendarDate, "Informe uma data válida."),
  subject: z.string(),
  totalQuestions: optionalCount,
  correctAnswers: optionalCount,
  wrongAnswers: optionalCount,
  questionListUrl: optionalHttpUrl,
  wrongQuestionListUrl: optionalHttpUrl,
});

export const studySessionInputSchema = rawStudySessionSchema.transform((data, context) => {
  try {
    return {
      studyDate: data.studyDate,
      ...normalizeSubject(data.subject),
      ...resolveQuestionCounts({
        totalQuestions: data.totalQuestions,
        correctAnswers: data.correctAnswers,
        wrongAnswers: data.wrongAnswers,
      }),
      questionListUrl: data.questionListUrl,
      wrongQuestionListUrl: data.wrongQuestionListUrl,
    };
  } catch (error) {
    context.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Dados inválidos." });
    return z.NEVER;
  }
});

export type StudySessionInput = z.output<typeof studySessionInputSchema>;
