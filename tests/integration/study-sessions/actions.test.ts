import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createSessionAction,
  deleteSessionAction,
  updateSessionAction,
} from "@/modules/study-sessions/actions";
import { createSession } from "@/modules/study-sessions/repository";

const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth-user", () => ({ requireUserId: mocks.requireUserId }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

function sessionFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    studyDate: "2026-08-23",
    subject: "  Direito   Civil  ",
    totalQuestions: "50",
    correctAnswers: "30",
    wrongAnswers: "",
    questionListUrl: "",
    wrongQuestionListUrl: "",
    ...overrides,
  };

  for (const [name, value] of Object.entries(values)) formData.set(name, value);
  return formData;
}

async function createUser(email: string) {
  return prisma.user.create({ data: { email, passwordHash: "hash" } });
}

async function createOwnedSession(userId: string) {
  return createSession(userId, {
    studyDate: "2026-08-22",
    subject: "Direito Administrativo",
    subjectKey: "direito administrativo",
    totalQuestions: 40,
    correctAnswers: 25,
    wrongAnswers: 15,
    questionListUrl: null,
    wrongQuestionListUrl: null,
  });
}

describe("study session actions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await prisma.studySession.deleteMany();
    await prisma.user.deleteMany();
  });

  it("creates a normalized session, revalidates views, and propagates the redirect", async () => {
    const user = await createUser("owner@example.com");
    const redirectError = new Error("NEXT_REDIRECT");
    mocks.requireUserId.mockResolvedValue(user.id);
    mocks.redirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(createSessionAction({}, sessionFormData())).rejects.toBe(redirectError);

    await expect(prisma.studySession.findFirst({ where: { userId: user.id } })).resolves.toMatchObject({
      subject: "Direito Civil",
      subjectKey: "direito civil",
      totalQuestions: 50,
      correctAnswers: 30,
      wrongAnswers: 20,
    });
    expect(mocks.requireUserId).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath.mock.calls).toEqual([["/dashboard"], ["/sessions"]]);
    expect(mocks.redirect).toHaveBeenCalledWith("/sessions");
  });

  it("returns validation errors with the submitted string values", async () => {
    const user = await createUser("owner@example.com");
    mocks.requireUserId.mockResolvedValue(user.id);
    const formData = sessionFormData({ subject: "", totalQuestions: "abc" });

    await expect(createSessionAction({}, formData)).resolves.toMatchObject({
      values: {
        studyDate: "2026-08-23",
        subject: "",
        totalQuestions: "abc",
        correctAnswers: "30",
        wrongAnswers: "",
      },
      fieldErrors: expect.any(Object),
      formError: expect.any(String),
    });
    await expect(prisma.studySession.count()).resolves.toBe(0);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("updates an owned session and does not swallow the redirect", async () => {
    const user = await createUser("owner@example.com");
    const session = await createOwnedSession(user.id);
    const redirectError = new Error("NEXT_REDIRECT");
    mocks.requireUserId.mockResolvedValue(user.id);
    mocks.redirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(updateSessionAction(
      session.id,
      {},
      sessionFormData({ subject: "Direito Constitucional", correctAnswers: "35" }),
    )).rejects.toBe(redirectError);

    await expect(prisma.studySession.findUnique({ where: { id: session.id } })).resolves.toMatchObject({
      subject: "Direito Constitucional",
      correctAnswers: 35,
      wrongAnswers: 15,
    });
    expect(mocks.revalidatePath.mock.calls).toEqual([["/dashboard"], ["/sessions"]]);
    expect(mocks.redirect).toHaveBeenCalledWith("/sessions");
  });

  it("treats a foreign update as a missing session", async () => {
    const [owner, stranger] = await Promise.all([
      createUser("owner@example.com"),
      createUser("stranger@example.com"),
    ]);
    const session = await createOwnedSession(owner.id);
    mocks.requireUserId.mockResolvedValue(stranger.id);

    await expect(updateSessionAction(session.id, {}, sessionFormData())).resolves.toMatchObject({
      formError: "Sessão não encontrada.",
      values: expect.objectContaining({ subject: "  Direito   Civil  " }),
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("treats a foreign delete as a missing session", async () => {
    const [owner, stranger] = await Promise.all([
      createUser("owner@example.com"),
      createUser("stranger@example.com"),
    ]);
    const session = await createOwnedSession(owner.id);
    mocks.requireUserId.mockResolvedValue(stranger.id);

    await expect(deleteSessionAction(session.id, {}, new FormData())).resolves.toEqual({
      formError: "Sessão não encontrada.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    await expect(prisma.studySession.findUnique({ where: { id: session.id } })).resolves.not.toBeNull();
  });

  it("deletes an owned session only before revalidating views", async () => {
    const user = await createUser("owner@example.com");
    const session = await createOwnedSession(user.id);
    mocks.requireUserId.mockResolvedValue(user.id);

    await expect(deleteSessionAction(session.id, {}, new FormData())).resolves.toEqual({});

    await expect(prisma.studySession.findUnique({ where: { id: session.id } })).resolves.toBeNull();
    expect(mocks.revalidatePath.mock.calls).toEqual([["/dashboard"], ["/sessions"]]);
  });
});
