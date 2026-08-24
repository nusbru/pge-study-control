import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { percentage } from "@/modules/study-sessions/domain";
import {
  getPeriodStart,
  parseDashboardToday,
  type DashboardPeriod,
} from "./period";

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
  overall: Omit<DashboardSubject, "subject" | "subjectKey">;
  subjects: DashboardSubject[];
};

type SubjectRow = {
  subject: string;
  subject_key: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
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
): Promise<DashboardData> {
  const validToday = parseDashboardToday(today);
  if (!validToday) throw new Error("Data de referência inválida.");
  const startDate = getPeriodStart(period, validToday);
  const dateFilter = startDate
    ? Prisma.sql`AND study_date >= ${startDate}::date`
    : Prisma.empty;
  const where = {
    userId,
    ...(startDate
      ? { studyDate: { gte: new Date(`${startDate}T00:00:00.000Z`) } }
      : {}),
  };

  const [rows, aggregate] = await Promise.all([
    prisma.$queryRaw<SubjectRow[]>(Prisma.sql`
      WITH filtered AS (
        SELECT * FROM study_sessions
        WHERE user_id = ${userId} ${dateFilter}
      ), latest AS (
        SELECT DISTINCT ON (subject_key) subject_key, subject
        FROM filtered
        ORDER BY subject_key, study_date DESC, created_at DESC
      )
      SELECT f.subject_key,
             l.subject,
             SUM(f.total_questions)::int AS total_questions,
             SUM(f.correct_answers)::int AS correct_answers,
             SUM(f.wrong_answers)::int AS wrong_answers
      FROM filtered f
      JOIN latest l ON l.subject_key = f.subject_key
      GROUP BY f.subject_key, l.subject
      ORDER BY SUM(f.total_questions) DESC, l.subject ASC
    `),
    prisma.studySession.aggregate({
      where,
      _sum: {
        totalQuestions: true,
        correctAnswers: true,
        wrongAnswers: true,
      },
    }),
  ]);

  const totalQuestions = aggregate._sum.totalQuestions ?? 0;
  const correctAnswers = aggregate._sum.correctAnswers ?? 0;
  const wrongAnswers = aggregate._sum.wrongAnswers ?? 0;

  return {
    overall: addPercentages(totalQuestions, correctAnswers, wrongAnswers),
    subjects: rows.map((row) => ({
      subject: row.subject,
      subjectKey: row.subject_key,
      ...addPercentages(row.total_questions, row.correct_answers, row.wrong_answers),
    })),
  };
}
