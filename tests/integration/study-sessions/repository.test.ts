import { beforeEach, describe, expect, it } from "vitest";
import { QuestionType } from "@/generated/prisma/enums";
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
      questionType: QuestionType.JURISPRUDENCE,
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
      questionType: QuestionType.JURISPRUDENCE,
    })).resolves.toBeNull();
    await expect(deleteSession(stranger.id, session.id)).resolves.toBe(false);
    await expect(getSession(owner.id, session.id)).resolves.toMatchObject({
      subject: "Direito Civil",
      questionType: QuestionType.JURISPRUDENCE,
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
      questionType: QuestionType.JURISPRUDENCE,
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
      questionType: QuestionType.DOCTRINE,
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
      questionType: QuestionType.DOCTRINE,
      totalQuestions: 60,
    });
    expect(updated?.studyDate.toISOString()).toBe("2026-08-24T00:00:00.000Z");
    await expect(deleteSession(owner.id, session.id)).resolves.toBe(true);
    await expect(getSession(owner.id, session.id)).resolves.toBeNull();
  });

  it("paginates only the user's sessions by study date, creation time, and ID", async () => {
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
        questionType: QuestionType.JURISPRUDENCE,
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
        questionType: QuestionType.JURISPRUDENCE,
        totalQuestions: 10,
        correctAnswers: 7,
        wrongAnswers: 3,
      };
    });
    await prisma.studySession.createMany({
      data: [
        ...dailySessions,
        {
          id: "same-date-a",
          userId: owner.id,
          studyDate: new Date("2026-08-20T00:00:00.000Z"),
          createdAt: new Date("2026-08-20T02:00:00.000Z"),
          subject: "Empate A",
          subjectKey: "empate a",
          questionType: QuestionType.JURISPRUDENCE,
          totalQuestions: 10,
          correctAnswers: 7,
          wrongAnswers: 3,
        },
        {
          id: "same-date-z",
          userId: owner.id,
          studyDate: new Date("2026-08-20T00:00:00.000Z"),
          createdAt: new Date("2026-08-20T02:00:00.000Z"),
          subject: "Empate Z",
          subjectKey: "empate z",
          questionType: QuestionType.JURISPRUDENCE,
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
      "same-date-z",
      "same-date-a",
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
        questionType: QuestionType.JURISPRUDENCE,
        totalQuestions: 50,
        correctAnswers: 40,
        wrongAnswers: 20,
      },
    })).rejects.toThrow();
    await expect(prisma.studySession.count()).resolves.toBe(0);
  });

  it("keeps question type required without a database default", async () => {
    const [questionTypeColumn] = await prisma.$queryRaw<Array<{
      is_nullable: "YES" | "NO";
      column_default: string | null;
    }>>`
      SELECT is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'study_sessions'
        AND column_name = 'question_type'
    `;

    expect(questionTypeColumn).toEqual({ is_nullable: "NO", column_default: null });
  });
});
