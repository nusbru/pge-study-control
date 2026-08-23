import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  updateSession,
} from "@/modules/study-sessions/repository";

describe("study session repository", () => {
  beforeEach(async () => {
    await prisma.studySession.deleteMany();
    await prisma.user.deleteMany();
  });

  it("never reads, updates, or deletes another user's session", async () => {
    const [owner, stranger] = await Promise.all([
      prisma.user.create({ data: { email: "owner@example.com", passwordHash: "hash" } }),
      prisma.user.create({ data: { email: "stranger@example.com", passwordHash: "hash" } }),
    ]);
    const session = await createSession(owner.id, {
      studyDate: "2026-08-23",
      subject: "Direito Civil",
      subjectKey: "direito civil",
      totalQuestions: 50,
      correctAnswers: 30,
      wrongAnswers: 20,
      questionListUrl: null,
      wrongQuestionListUrl: null,
    });

    await expect(getSession(stranger.id, session.id)).resolves.toBeNull();
    await expect(updateSession(stranger.id, session.id, {
      ...session,
      studyDate: "2026-08-23",
    })).resolves.toBeNull();
    await expect(deleteSession(stranger.id, session.id)).resolves.toBe(false);
    await expect(getSession(owner.id, session.id)).resolves.toMatchObject({
      subject: "Direito Civil",
      totalQuestions: 50,
      correctAnswers: 30,
      wrongAnswers: 20,
    });
  });

  it("updates and deletes a session owned by the user", async () => {
    const owner = await prisma.user.create({
      data: { email: "owner@example.com", passwordHash: "hash" },
    });
    const session = await createSession(owner.id, {
      studyDate: "2026-08-23",
      subject: "Direito Civil",
      subjectKey: "direito civil",
      totalQuestions: 50,
      correctAnswers: 30,
      wrongAnswers: 20,
      questionListUrl: null,
      wrongQuestionListUrl: null,
    });

    const updated = await updateSession(owner.id, session.id, {
      studyDate: "2026-08-24",
      subject: "Direito Constitucional",
      subjectKey: "direito constitucional",
      totalQuestions: 60,
      correctAnswers: 40,
      wrongAnswers: 20,
      questionListUrl: "https://questoes.example/lista/1",
      wrongQuestionListUrl: null,
    });

    expect(updated).toMatchObject({
      id: session.id,
      userId: owner.id,
      subject: "Direito Constitucional",
      totalQuestions: 60,
    });
    expect(updated?.studyDate.toISOString()).toBe("2026-08-24T00:00:00.000Z");
    await expect(deleteSession(owner.id, session.id)).resolves.toBe(true);
    await expect(getSession(owner.id, session.id)).resolves.toBeNull();
  });

  it("paginates only the user's sessions by study date and creation time", async () => {
    const [owner, stranger] = await Promise.all([
      prisma.user.create({ data: { email: "owner@example.com", passwordHash: "hash" } }),
      prisma.user.create({ data: { email: "stranger@example.com", passwordHash: "hash" } }),
    ]);
    const dailySessions = Array.from({ length: 19 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return {
        id: `owner-day-${day}`,
        userId: owner.id,
        studyDate: new Date(`2026-08-${day}T00:00:00.000Z`),
        subject: `Assunto ${day}`,
        subjectKey: `assunto ${day}`,
        totalQuestions: 10,
        correctAnswers: 7,
        wrongAnswers: 3,
      };
    });
    const strangerSessions = Array.from({ length: 20 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return {
        id: `stranger-day-${day}`,
        userId: stranger.id,
        studyDate: new Date(`2026-09-${day}T00:00:00.000Z`),
        subject: `Sessão alheia ${day}`,
        subjectKey: `sessao alheia ${day}`,
        totalQuestions: 10,
        correctAnswers: 7,
        wrongAnswers: 3,
      };
    });
    await prisma.studySession.createMany({
      data: [
        ...dailySessions,
        {
          id: "same-date-old",
          userId: owner.id,
          studyDate: new Date("2026-08-20T00:00:00.000Z"),
          createdAt: new Date("2026-08-20T01:00:00.000Z"),
          subject: "Mais antigo",
          subjectKey: "mais antigo",
          totalQuestions: 10,
          correctAnswers: 7,
          wrongAnswers: 3,
        },
        {
          id: "same-date-new",
          userId: owner.id,
          studyDate: new Date("2026-08-20T00:00:00.000Z"),
          createdAt: new Date("2026-08-20T02:00:00.000Z"),
          subject: "Mais novo",
          subjectKey: "mais novo",
          totalQuestions: 10,
          correctAnswers: 7,
          wrongAnswers: 3,
        },
        ...strangerSessions,
      ],
    });

    const firstPage = await listSessions(owner.id, 1);
    const secondPage = await listSessions(owner.id, 2);

    expect(firstPage.totalPages).toBe(2);
    expect(firstPage.records).toHaveLength(20);
    expect(firstPage.records.slice(0, 2).map(({ id }) => id)).toEqual([
      "same-date-new",
      "same-date-old",
    ]);
    expect(secondPage).toMatchObject({ totalPages: 2 });
    expect(secondPage.records.map(({ id }) => id)).toEqual(["owner-day-01"]);
  });

  it("rejects inconsistent question counts at the database boundary", async () => {
    const owner = await prisma.user.create({
      data: { email: "owner@example.com", passwordHash: "hash" },
    });

    await expect(prisma.studySession.create({
      data: {
        userId: owner.id,
        studyDate: new Date("2026-08-23T00:00:00.000Z"),
        subject: "Direito Civil",
        subjectKey: "direito civil",
        totalQuestions: 50,
        correctAnswers: 40,
        wrongAnswers: 20,
      },
    })).rejects.toThrow();
    await expect(prisma.studySession.count()).resolves.toBe(0);
  });
});
