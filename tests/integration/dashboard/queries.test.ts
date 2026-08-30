import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuestionType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { DashboardPeriod } from "@/modules/dashboard/period";
import { getDashboard } from "@/modules/dashboard/queries";
import { listSessions, createSession } from "@/modules/study-sessions/repository";
import { studySessionInputSchema } from "@/modules/study-sessions/schema";

describe("dashboard queries", () => {
  beforeEach(async () => {
    await prisma.studySession.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("weights counts inside the inclusive period and isolates the user", async () => {
    const [owner, stranger] = await Promise.all([
      prisma.user.create({ data: { email: "dashboard-owner@example.com", passwordHash: "hash" } }),
      prisma.user.create({ data: { email: "dashboard-stranger@example.com", passwordHash: "hash" } }),
    ]);
    await prisma.studySession.createMany({
      data: [
        {
          userId: owner.id,
          studyDate: new Date("2026-08-23T00:00:00.000Z"),
          subject: "Direito Civil",
          subjectKey: "direito civil",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 10,
          correctAnswers: 8,
          wrongAnswers: 2,
        },
        {
          userId: owner.id,
          studyDate: new Date("2026-08-22T00:00:00.000Z"),
          subject: "direito civil",
          subjectKey: "direito civil",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 2,
          correctAnswers: 1,
          wrongAnswers: 1,
        },
        {
          userId: owner.id,
          studyDate: new Date("2026-05-01T00:00:00.000Z"),
          subject: "Direito Antigo",
          subjectKey: "direito antigo",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 10,
          correctAnswers: 10,
          wrongAnswers: 0,
        },
        {
          userId: owner.id,
          studyDate: new Date("2026-08-24T00:00:00.000Z"),
          subject: "Direito Futuro",
          subjectKey: "direito futuro",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 50,
          correctAnswers: 0,
          wrongAnswers: 50,
        },
        {
          userId: stranger.id,
          studyDate: new Date("2026-08-23T00:00:00.000Z"),
          subject: "Direito Civil",
          subjectKey: "direito civil",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 100,
          correctAnswers: 0,
          wrongAnswers: 100,
        },
      ],
    });

    await expect(getDashboard(owner.id, "30d", "2026-08-23", "all")).resolves.toEqual({
      overall: {
        totalQuestions: 12,
        correctAnswers: 9,
        wrongAnswers: 3,
        correctPercentage: 75,
        wrongPercentage: 25,
      },
      subjects: [
        {
          subject: "Direito Civil",
          subjectKey: "direito civil",
          totalQuestions: 12,
          correctAnswers: 9,
          wrongAnswers: 3,
          correctPercentage: 75,
          wrongPercentage: 25,
        },
      ],
    });
  });

  it("filters all dashboard aggregates by question type and isolates the user", async () => {
    const [owner, stranger] = await Promise.all([
      prisma.user.create({ data: { email: "dashboard-filter-owner@example.com", passwordHash: "hash" } }),
      prisma.user.create({ data: { email: "dashboard-filter-stranger@example.com", passwordHash: "hash" } }),
    ]);
    const studyDate = new Date("2026-08-23T00:00:00.000Z");
    await prisma.studySession.createMany({
      data: [
        {
          userId: owner.id,
          studyDate,
          subject: "Direito Civil",
          subjectKey: "direito civil",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 10,
          correctAnswers: 8,
          wrongAnswers: 2,
        },
        {
          userId: owner.id,
          studyDate,
          subject: "Direito Penal",
          subjectKey: "direito penal",
          questionType: QuestionType.DOCTRINE,
          totalQuestions: 20,
          correctAnswers: 10,
          wrongAnswers: 10,
        },
        {
          userId: owner.id,
          studyDate,
          subject: "Direito Administrativo",
          subjectKey: "direito administrativo",
          questionType: QuestionType.UNSPECIFIED,
          totalQuestions: 5,
          correctAnswers: 3,
          wrongAnswers: 2,
        },
        {
          userId: stranger.id,
          studyDate,
          subject: "Direito Civil",
          subjectKey: "direito civil",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 100,
          correctAnswers: 100,
          wrongAnswers: 0,
        },
      ],
    });

    await expect(
      getDashboard(owner.id, "30d", "2026-08-23", QuestionType.JURISPRUDENCE),
    ).resolves.toMatchObject({
      overall: { totalQuestions: 10, correctAnswers: 8, wrongAnswers: 2 },
      subjects: [{ subject: "Direito Civil", totalQuestions: 10 }],
    });
    await expect(
      getDashboard(owner.id, "30d", "2026-08-23", QuestionType.UNSPECIFIED),
    ).resolves.toMatchObject({
      overall: { totalQuestions: 5, correctAnswers: 3, wrongAnswers: 2 },
    });
    await expect(getDashboard(owner.id, "30d", "2026-08-23", "all")).resolves.toMatchObject({
      overall: { totalQuestions: 35, correctAnswers: 21, wrongAnswers: 14 },
    });
  });

  it("keeps all history through today, excludes future records, and orders by volume", async () => {
    const owner = await prisma.user.create({
      data: { email: "dashboard-order@example.com", passwordHash: "hash" },
    });
    await prisma.studySession.createMany({
      data: [
        {
          userId: owner.id,
          studyDate: new Date("2025-01-10T00:00:00.000Z"),
          subject: "Direito Civil",
          subjectKey: "direito civil",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 5,
          correctAnswers: 3,
          wrongAnswers: 2,
        },
        {
          userId: owner.id,
          studyDate: new Date("2024-12-01T00:00:00.000Z"),
          subject: "Direito Penal",
          subjectKey: "direito penal",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 20,
          correctAnswers: 10,
          wrongAnswers: 10,
        },
        {
          userId: owner.id,
          studyDate: new Date("2027-01-01T00:00:00.000Z"),
          subject: "Direito Futuro",
          subjectKey: "direito futuro",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 30,
          correctAnswers: 15,
          wrongAnswers: 15,
        },
      ],
    });

    const dashboard = await getDashboard(owner.id, "all", "2026-08-23", "all");

    expect(dashboard.subjects.map(({ subject }) => subject)).toEqual([
      "Direito Penal",
      "Direito Civil",
    ]);
    expect(dashboard.overall).toMatchObject({
      totalQuestions: 25,
      correctAnswers: 13,
      wrongAnswers: 12,
      correctPercentage: 52,
      wrongPercentage: 48,
    });
  });

  it("returns unavailable overall percentages when the period has no questions", async () => {
    const owner = await prisma.user.create({
      data: { email: "dashboard-empty@example.com", passwordHash: "hash" },
    });

    await expect(getDashboard(owner.id, "30d", "2026-08-23", "all")).resolves.toEqual({
      overall: {
        totalQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        correctPercentage: null,
        wrongPercentage: null,
      },
      subjects: [],
    });
  });

  it("creates, lists, and aggregates a valid subject whose lowercase key expands", async () => {
    const owner = await prisma.user.create({
      data: { email: "dashboard-unicode@example.com", passwordHash: "hash" },
    });
    const subject = "İ".repeat(120);
    const input = studySessionInputSchema.parse({
      studyDate: "2026-08-23",
      subject,
      questionType: "JURISPRUDENCE",
      totalQuestions: "10",
      correctAnswers: "7",
      wrongAnswers: "3",
      questionListUrl: "",
      wrongQuestionListUrl: "",
    });

    await createSession(owner.id, input);
    const history = await listSessions(owner.id, 1);
    const dashboard = await getDashboard(owner.id, "all", "2026-08-23", "all");

    expect(history.records[0]).toMatchObject({ subject, subjectKey: "i̇".repeat(120) });
    expect(dashboard.overall).toMatchObject({
      totalQuestions: 10,
      correctAnswers: 7,
      wrongAnswers: 3,
      correctPercentage: 70,
      wrongPercentage: 30,
    });
    expect(dashboard.subjects[0]).toMatchObject({
      subject,
      subjectKey: "i̇".repeat(120),
      totalQuestions: 10,
    });
  });

  it("uses the highest ID as the stable spelling tie-break", async () => {
    const owner = await prisma.user.create({
      data: { email: "dashboard-tie@example.com", passwordHash: "hash" },
    });
    const tiedAt = new Date("2026-08-23T12:00:00.000Z");
    await prisma.studySession.createMany({
      data: [
        {
          id: "tie-a",
          userId: owner.id,
          studyDate: new Date("2026-08-23T00:00:00.000Z"),
          createdAt: tiedAt,
          subject: "grafia antiga",
          subjectKey: "direito civil",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 5,
          correctAnswers: 3,
          wrongAnswers: 2,
        },
        {
          id: "tie-z",
          userId: owner.id,
          studyDate: new Date("2026-08-23T00:00:00.000Z"),
          createdAt: tiedAt,
          subject: "Grafia Estável",
          subjectKey: "direito civil",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 5,
          correctAnswers: 4,
          wrongAnswers: 1,
        },
      ],
    });

    const dashboard = await getDashboard(owner.id, "7d", "2026-08-23", "all");

    expect(dashboard.subjects[0]).toMatchObject({
      subject: "Grafia Estável",
      totalQuestions: 10,
    });
  });

  it("reads subjects and overall totals with one SQL statement", async () => {
    const owner = await prisma.user.create({
      data: { email: "dashboard-snapshot@example.com", passwordHash: "hash" },
    });
    const rawQuery = vi.spyOn(prisma, "$queryRaw");
    const aggregate = vi.spyOn(prisma.studySession, "aggregate");

    await getDashboard(owner.id, "30d", "2026-08-23", "all");

    expect(rawQuery).toHaveBeenCalledOnce();
    expect(aggregate).not.toHaveBeenCalled();
  });

  it("returns cumulative bigint totals above the PostgreSQL integer maximum", async () => {
    const owner = await prisma.user.create({
      data: { email: "dashboard-bigint@example.com", passwordHash: "hash" },
    });
    await prisma.$executeRaw`
      INSERT INTO study_sessions (
        id, user_id, study_date, subject, subject_key, question_type,
        total_questions, correct_answers, wrong_answers, created_at, updated_at
      )
      SELECT 'bulk-' || value::text,
             ${owner.id},
             DATE '2026-08-23',
             'Direito Civil',
             'direito civil',
             'JURISPRUDENCE'::"QuestionType",
             1000000,
             1000000,
             0,
             CURRENT_TIMESTAMP,
             CURRENT_TIMESTAMP
      FROM generate_series(1, 2148) AS value
    `;

    const dashboard = await getDashboard(owner.id, "7d", "2026-08-23", "all");

    expect(dashboard.overall).toMatchObject({
      totalQuestions: 2_148_000_000,
      correctAnswers: 2_148_000_000,
      wrongAnswers: 0,
      correctPercentage: 100,
      wrongPercentage: 0,
    });
    expect(dashboard.subjects[0]).toMatchObject({
      totalQuestions: 2_148_000_000,
      correctAnswers: 2_148_000_000,
      wrongAnswers: 0,
    });
  });

  it.each([
    ["7d", "0001-01-07"],
    ["30d", "0001-01-30"],
    ["90d", "0001-03-31"],
    ["all", "0001-01-01"],
  ])("queries the earliest supported %s window ending on %s", async (period, today) => {
    const owner = await prisma.user.create({
      data: { email: `dashboard-${period}@example.com`, passwordHash: "hash" },
    });

    await expect(
      getDashboard(owner.id, period as DashboardPeriod, today, "all"),
    ).resolves.toMatchObject({
      overall: {
        totalQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
      },
      subjects: [],
    });
  });
});
