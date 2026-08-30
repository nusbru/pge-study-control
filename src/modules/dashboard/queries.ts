import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { percentage } from "@/modules/study-sessions/domain";
import {
  getPeriodStart,
  parseDashboardToday,
  type DashboardPeriod,
} from "./period";
import type { DashboardQuestionType } from "./question-type-filter";
import { bigintToSafeInteger } from "./safe-integer";

export type DashboardSubject = {
  subject: string;
  subjectKey: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  correctPercentage: number;
  wrongPercentage: number;
};

export type DashboardData = {
  overall: Omit<
    DashboardSubject,
    "subject" | "subjectKey" | "correctPercentage" | "wrongPercentage"
  > & {
    correctPercentage: number | null;
    wrongPercentage: number | null;
  };
  subjects: DashboardSubject[];
};

type DashboardRow = {
  subject: string | null;
  subject_key: string | null;
  total_questions: bigint | null;
  correct_answers: bigint | null;
  wrong_answers: bigint | null;
  overall_total_questions: bigint;
  overall_correct_answers: bigint;
  overall_wrong_answers: bigint;
};

function addPercentages(totalQuestions: number, correctAnswers: number, wrongAnswers: number) {
  return {
    totalQuestions,
    correctAnswers,
    wrongAnswers,
    correctPercentage: totalQuestions > 0 ? percentage(correctAnswers, totalQuestions) : 0,
    wrongPercentage: totalQuestions > 0 ? percentage(wrongAnswers, totalQuestions) : 0,
  };
}

export async function getDashboard(
  userId: string,
  period: DashboardPeriod,
  today: string,
  questionType: DashboardQuestionType,
): Promise<DashboardData> {
  const validToday = parseDashboardToday(today);
  if (!validToday) throw new Error("Data de referência inválida.");
  const startDate = getPeriodStart(period, validToday);
  const dateFilter = startDate
    ? Prisma.sql`AND study_date BETWEEN ${startDate}::date AND ${validToday}::date`
    : Prisma.sql`AND study_date <= ${validToday}::date`;
  const questionTypeFilter = questionType === "all"
    ? Prisma.empty
    : Prisma.sql`AND question_type = ${questionType}::"QuestionType"`;
  const rows = await prisma.$queryRaw<DashboardRow[]>(Prisma.sql`
    WITH filtered AS (
      SELECT * FROM study_sessions
      WHERE user_id = ${userId} ${dateFilter} ${questionTypeFilter}
    ), latest AS (
      SELECT DISTINCT ON (subject_key) subject_key, subject
      FROM filtered
      ORDER BY subject_key, study_date DESC, created_at DESC, id DESC
    ), subjects AS (
      SELECT f.subject_key,
             l.subject,
             SUM(f.total_questions) AS total_questions,
             SUM(f.correct_answers) AS correct_answers,
             SUM(f.wrong_answers) AS wrong_answers
      FROM filtered f
      JOIN latest l ON l.subject_key = f.subject_key
      GROUP BY f.subject_key, l.subject
    ), overall AS (
      SELECT COALESCE(SUM(total_questions), 0)::bigint AS total_questions,
             COALESCE(SUM(correct_answers), 0)::bigint AS correct_answers,
             COALESCE(SUM(wrong_answers), 0)::bigint AS wrong_answers
      FROM filtered
    )
    SELECT s.subject_key,
           s.subject,
           s.total_questions,
           s.correct_answers,
           s.wrong_answers,
           o.total_questions AS overall_total_questions,
           o.correct_answers AS overall_correct_answers,
           o.wrong_answers AS overall_wrong_answers
    FROM overall o
    LEFT JOIN subjects s ON TRUE
    ORDER BY s.total_questions DESC NULLS LAST, s.subject ASC
  `);
  const overallRow = rows[0];
  if (!overallRow) throw new Error("Consulta de desempenho não retornou o resumo.");
  const totalQuestions = bigintToSafeInteger(overallRow.overall_total_questions);
  const correctAnswers = bigintToSafeInteger(overallRow.overall_correct_answers);
  const wrongAnswers = bigintToSafeInteger(overallRow.overall_wrong_answers);

  return {
    overall: totalQuestions > 0
      ? addPercentages(totalQuestions, correctAnswers, wrongAnswers)
      : {
          totalQuestions,
          correctAnswers,
          wrongAnswers,
          correctPercentage: null,
          wrongPercentage: null,
        },
    subjects: rows.flatMap((row) => {
      if (
        row.subject === null
        || row.subject_key === null
        || row.total_questions === null
        || row.correct_answers === null
        || row.wrong_answers === null
      ) return [];
      return [{
        subject: row.subject,
        subjectKey: row.subject_key,
        ...addPercentages(
          bigintToSafeInteger(row.total_questions),
          bigintToSafeInteger(row.correct_answers),
          bigintToSafeInteger(row.wrong_answers),
        ),
      }];
    }),
  };
}
