import { z } from "zod";
import { normalizeSubject, resolveQuestionCounts } from "./domain";

const COUNT_ERROR = "Use números inteiros entre 0 e 1.000.000.";
const DATE_ERROR = "Informe uma data válida.";
const SUBJECT_ERROR = "Informe um assunto com até 120 caracteres.";
const URL_ERROR = "Informe uma URL HTTP ou HTTPS válida.";

const optionalCount = z.preprocess(
  (value) => value === "" || value === null ? undefined : typeof value === "string" ? Number(value) : value,
  z.number({ error: COUNT_ERROR })
    .int({ error: COUNT_ERROR })
    .min(0, { error: COUNT_ERROR })
    .max(1_000_000, { error: COUNT_ERROR })
    .optional(),
);

const optionalHttpUrl = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.string({ error: URL_ERROR }).max(2_048, { error: URL_ERROR }).refine((value) => {
    try { return ["http:", "https:"].includes(new URL(value).protocol); }
    catch { return false; }
  }, URL_ERROR).nullable(),
);

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year === 0) return false;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const rawStudySessionSchema = z.object({
  studyDate: z.string({ error: DATE_ERROR }).refine(isCalendarDate, DATE_ERROR),
  subject: z.string({ error: SUBJECT_ERROR }),
  totalQuestions: optionalCount,
  correctAnswers: optionalCount,
  wrongAnswers: optionalCount,
  questionListUrl: optionalHttpUrl,
  wrongQuestionListUrl: optionalHttpUrl,
}, { error: "Dados inválidos." });

export const studySessionInputSchema = rawStudySessionSchema.transform((data, context) => {
  let normalizedSubject: ReturnType<typeof normalizeSubject>;
  try {
    normalizedSubject = normalizeSubject(data.subject);
  } catch (error) {
    context.addIssue({
      code: "custom",
      path: ["subject"],
      message: error instanceof Error ? error.message : SUBJECT_ERROR,
    });
    return z.NEVER;
  }

  try {
    return {
      studyDate: data.studyDate,
      ...normalizedSubject,
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
