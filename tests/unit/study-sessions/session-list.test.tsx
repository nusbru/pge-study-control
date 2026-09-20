import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionType, type StudySession } from "@/lib/api/contracts";
import { SessionList } from "@/modules/study-sessions/session-list";

const mocks = vi.hoisted(() => ({
  deleteSessionAction: vi.fn(),
}));

vi.mock("@/modules/study-sessions/actions", () => ({
  deleteSessionAction: mocks.deleteSessionAction,
}));

afterEach(cleanup);

function session(overrides: Partial<StudySession>): StudySession {
  return {
    id: "session-1",
    studyDate: new Date("2026-08-23T00:00:00.000Z"),
    subject: "Direito Civil",
    subjectId: "98287845-45f8-46db-9d4c-4d4139ded7b1",
    questionType: QuestionType.JURISPRUDENCE,
    totalQuestions: 50,
    correctAnswers: 30,
    wrongAnswers: 20,
    questionListUrl: null,
    wrongQuestionListUrl: null,
    createdAt: new Date("2026-08-23T12:00:00.000Z"),
    updatedAt: new Date("2026-08-23T12:00:00.000Z"),
    ...overrides,
  };
}

describe("SessionList", () => {
  it("preserves the subject on both pagination links", () => {
    const subjectId = session({}).subjectId;
    render(<SessionList sessions={[session({})]} page={2} totalPages={3} subjectId={subjectId} />);
    expect(screen.getByRole("link", { name: "Página anterior" })).toHaveAttribute("href", `/sessions?page=1&subjectId=${subjectId}`);
    expect(screen.getByRole("link", { name: "Próxima página" })).toHaveAttribute("href", `/sessions?page=3&subjectId=${subjectId}`);
  });

  it("explains empty filtered results and allows clearing the subject", () => {
    render(<SessionList sessions={[]} page={1} totalPages={0} subjectId={session({}).subjectId} />);
    expect(screen.getByRole("heading", { name: "Nenhuma sessão encontrada para este assunto" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver todos os assuntos" })).toHaveAttribute("href", "/sessions");
    expect(screen.queryByText("Seu histórico começa com uma sessão")).not.toBeInTheDocument();
  });

  it("keeps the subject when returning from an out-of-range page", () => {
    const subjectId = session({}).subjectId;
    render(<SessionList sessions={[]} page={5} totalPages={1} subjectId={subjectId} />);
    expect(screen.getByRole("link", { name: "Voltar ao início do histórico" })).toHaveAttribute("href", `/sessions?page=1&subjectId=${subjectId}`);
  });

  it("formats whole and fractional percentages with one decimal in Brazilian Portuguese", () => {
    render(
      <SessionList
        sessions={[
          session({ id: "whole" }),
          session({
            id: "fractional",
            subject: "Direito Tributário",
            subjectId: "7ae8cde0-ca6e-4698-889f-af340b7fb063",
            totalQuestions: 3,
            correctAnswers: 2,
            wrongAnswers: 1,
          }),
        ]}
        page={1}
        totalPages={1}
      />,
    );

    expect(screen.getByText("30 (60,0%)")).toBeVisible();
    expect(screen.getByText("20 (40,0%)")).toBeVisible();
    expect(screen.getByText("2 (66,7%)")).toBeVisible();
    expect(screen.getByText("1 (33,3%)")).toBeVisible();
  });

  it("links each listed session to its details page", () => {
    render(
      <SessionList
        sessions={[session({ id: "session-details" })]}
        page={1}
        totalPages={1}
      />,
    );

    expect(screen.getByRole("link", { name: "Ver detalhes" })).toHaveAttribute(
      "href",
      "/sessions/session-details",
    );
  });

  it("shows localized question types for classified and legacy sessions", () => {
    render(
      <SessionList
        sessions={[
          session({ questionType: QuestionType.DOCTRINE }),
          session({
            id: "legacy-session",
            subject: "Direito Administrativo",
            subjectId: "f5334eed-b09c-46e6-9463-5b2943329b07",
            questionType: QuestionType.UNSPECIFIED,
          }),
        ]}
        page={1}
        totalPages={1}
      />,
    );

    const [doctrineSession, legacySession] = screen.getAllByRole("listitem");
    expect(within(doctrineSession).getByText("Doutrina")).toBeVisible();
    expect(within(legacySession).getByText("Não informado")).toBeVisible();
  });
});
