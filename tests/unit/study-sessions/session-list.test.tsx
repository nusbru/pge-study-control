import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudySession } from "@/generated/prisma/client";
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
    userId: "user-1",
    studyDate: new Date("2026-08-23T00:00:00.000Z"),
    subject: "Direito Civil",
    subjectKey: "direito civil",
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
  it("formats whole and fractional percentages with one decimal in Brazilian Portuguese", () => {
    render(
      <SessionList
        sessions={[
          session({ id: "whole" }),
          session({
            id: "fractional",
            subject: "Direito Tributário",
            subjectKey: "direito tributario",
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
});
