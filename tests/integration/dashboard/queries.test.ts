import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getDashboard } from "@/modules/dashboard/queries";

describe("dashboard queries", () => {
  beforeEach(async () => {
    await prisma.studySession.deleteMany();
    await prisma.user.deleteMany();
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

  it("includes the full history and orders subjects by question volume", async () => {
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
      ],
    });

    const dashboard = await getDashboard(owner.id, "all", "2026-08-23");

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
});
