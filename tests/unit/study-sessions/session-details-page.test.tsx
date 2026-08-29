import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudySession } from "@/generated/prisma/client";
import SessionDetailsPage from "@/app/(protected)/sessions/[id]/page";

const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  getSession: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("@/lib/auth-user", () => ({
  requireUserId: mocks.requireUserId,
}));

vi.mock("@/modules/study-sessions/repository", () => ({
  getSession: mocks.getSession,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

const studySession: StudySession = {
  id: "session-1",
  userId: "user-1",
  studyDate: new Date("2026-08-23T00:00:00.000Z"),
  subject: "Direito Civil",
  subjectKey: "direito civil",
  totalQuestions: 50,
  correctAnswers: 30,
  wrongAnswers: 20,
  questionListUrl: "https://example.com/questions",
  wrongQuestionListUrl: "https://example.com/errors",
  createdAt: new Date("2026-08-23T12:00:00.000Z"),
  updatedAt: new Date("2026-08-23T12:00:00.000Z"),
};

beforeEach(() => {
  mocks.requireUserId.mockResolvedValue("user-1");
  mocks.getSession.mockResolvedValue(studySession);
  mocks.notFound.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SessionDetailsPage", () => {
  it("loads the owned session and renders its details and actions", async () => {
    const page = await SessionDetailsPage({
      params: Promise.resolve({ id: "session-1" }),
    });

    render(page);

    expect(mocks.requireUserId).toHaveBeenCalledOnce();
    expect(mocks.getSession).toHaveBeenCalledWith("user-1", "session-1");
    expect(screen.getByRole("heading", { name: "Direito Civil" })).toBeVisible();
    expect(screen.getByText("23/08/2026")).toBeVisible();
    expect(screen.getByText("30 (60,0%)")).toBeVisible();
    expect(screen.getByText("20 (40,0%)")).toBeVisible();
    expect(screen.getByText("50")).toBeVisible();

    const questions = screen.getByRole("link", {
      name: "Lista de questões (abre em nova aba)",
    });
    expect(questions).toHaveAttribute("href", "https://example.com/questions");
    expect(questions).toHaveAttribute("target", "_blank");
    expect(questions).toHaveAttribute("rel", "noopener noreferrer");

    const errors = screen.getByRole("link", {
      name: "Lista de erros (abre em nova aba)",
    });
    expect(errors).toHaveAttribute("href", "https://example.com/errors");
    expect(errors).toHaveAttribute("target", "_blank");
    expect(errors).toHaveAttribute("rel", "noopener noreferrer");

    expect(screen.getByRole("link", { name: "Editar sessão" })).toHaveAttribute(
      "href",
      "/sessions/session-1/edit",
    );
    expect(screen.getByRole("link", { name: "Voltar ao histórico" })).toHaveAttribute(
      "href",
      "/sessions",
    );
  });

  it("omits the materials section when the session has no external links", async () => {
    mocks.getSession.mockResolvedValueOnce({
      ...studySession,
      questionListUrl: null,
      wrongQuestionListUrl: null,
    });
    const page = await SessionDetailsPage({
      params: Promise.resolve({ id: "session-1" }),
    });

    render(page);

    expect(screen.queryByRole("region", { name: "Materiais da sessão" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Lista de questões (abre em nova aba)" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Lista de erros (abre em nova aba)" }),
    ).not.toBeInTheDocument();
  });

  it("returns not found when the session is missing or inaccessible", async () => {
    mocks.getSession.mockResolvedValueOnce(null);

    await expect(
      SessionDetailsPage({ params: Promise.resolve({ id: "unknown" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.getSession).toHaveBeenCalledWith("user-1", "unknown");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
