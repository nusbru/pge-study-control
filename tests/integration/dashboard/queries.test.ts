import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DashboardPeriod } from "@/modules/dashboard/period";
import { getDashboard } from "@/modules/dashboard/queries";

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
          totalQuestions: 10,
          correctAnswers: 8,
          wrongAnswers: 2,
        },
        {
          userId: owner.id,
          studyDate: new Date("2026-08-22T00:00:00.000Z"),
          subject: "direito civil",
          subjectKey: "direito civil",
          totalQuestions: 2,
          correctAnswers: 1,
          wrongAnswers: 1,
        },
        {
          userId: owner.id,
          studyDate: new Date("2026-05-01T00:00:00.000Z"),
          subject: "Direito Antigo",
          subjectKey: "direito antigo",
          totalQuestions: 10,
          correctAnswers: 10,
          wrongAnswers: 0,
        },
        {
          userId: owner.id,
          studyDate: new Date("2026-08-24T00:00:00.000Z"),
          subject: "Direito Futuro",
          subjectKey: "direito futuro",
          totalQuestions: 50,
          correctAnswers: 0,
          wrongAnswers: 50,
        },
        {
          userId: stranger.id,
          studyDate: new Date("2026-08-23T00:00:00.000Z"),
          subject: "Direito Civil",
          subjectKey: "direito civil",
          totalQuestions: 100,
          correctAnswers: 0,
          wrongAnswers: 100,
        },
      ],
    });

    await expect(getDashboard(owner.id, "30d", "2026-08-23")).resolves.toEqual({
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

  it("keeps all history unbounded, including future records, and orders by volume", async () => {
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
          totalQuestions: 5,
          correctAnswers: 3,
          wrongAnswers: 2,
        },
        {
          userId: owner.id,
          studyDate: new Date("2024-12-01T00:00:00.000Z"),
          subject: "Direito Penal",
          subjectKey: "direito penal",
          totalQuestions: 20,
          correctAnswers: 10,
          wrongAnswers: 10,
        },
        {
          userId: owner.id,
          studyDate: new Date("2027-01-01T00:00:00.000Z"),
          subject: "Direito Futuro",
          subjectKey: "direito futuro",
          totalQuestions: 30,
          correctAnswers: 15,
          wrongAnswers: 15,
        },
      ],
    });

    const dashboard = await getDashboard(owner.id, "all", "2026-08-23");

    expect(dashboard.subjects.map(({ subject }) => subject)).toEqual([
      "Direito Futuro",
      "Direito Penal",
      "Direito Civil",
    ]);
    expect(dashboard.overall).toMatchObject({
      totalQuestions: 55,
      correctAnswers: 28,
      wrongAnswers: 27,
      correctPercentage: 50.9,
      wrongPercentage: 49.1,
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
          totalQuestions: 5,
          correctAnswers: 4,
          wrongAnswers: 1,
        },
      ],
    });

    const dashboard = await getDashboard(owner.id, "7d", "2026-08-23");

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

    await getDashboard(owner.id, "30d", "2026-08-23");

    expect(rawQuery).toHaveBeenCalledOnce();
    expect(aggregate).not.toHaveBeenCalled();
  });

  it("returns cumulative bigint totals above the PostgreSQL integer maximum", async () => {
    const owner = await prisma.user.create({
      data: { email: "dashboard-bigint@example.com", passwordHash: "hash" },
    });
    await prisma.$executeRaw`
      INSERT INTO study_sessions (
        id, user_id, study_date, subject, subject_key,
        total_questions, correct_answers, wrong_answers, created_at, updated_at
      )
      SELECT 'bulk-' || value::text,
             ${owner.id},
             DATE '2026-08-23',
             'Direito Civil',
             'direito civil',
             1000000,
             1000000,
             0,
             CURRENT_TIMESTAMP,
             CURRENT_TIMESTAMP
      FROM generate_series(1, 2148) AS value
    `;

    const dashboard = await getDashboard(owner.id, "7d", "2026-08-23");

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
      getDashboard(owner.id, period as DashboardPeriod, today),
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
