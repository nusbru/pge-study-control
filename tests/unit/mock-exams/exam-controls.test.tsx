import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExamTimer } from "@/modules/mock-exams/exam-controls";
import type { MockExamResponse } from "@/lib/api/contracts";

vi.mock("@/lib/api/browser", () => ({ mutateApi: vi.fn(), navigateAfterMutation: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("ExamTimer", () => {
  it("recovers elapsed time from persisted timestamps after remounting", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T00:30:00Z"));
    const exam: MockExamResponse = { id: "exam", examDate: "2026-09-14", totalQuestions: 100,
      correctAnswers: null, wrongAnswers: null, status: "RUNNING", isHistorical: false,
      startedAt: "2026-09-14T23:30:00Z", endedAt: null, durationSeconds: null, feeling: null, comment: null, version: "v1" };
    const first = render(<ExamTimer exam={exam} />);
    expect(screen.getByRole("timer")).toHaveTextContent("01:00:00");
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("timer")).toHaveTextContent("01:00:03");
    first.unmount();
    vi.setSystemTime(new Date("2026-09-15T01:30:00Z"));
    render(<ExamTimer exam={exam} />);
    expect(screen.getByRole("timer")).toHaveTextContent("02:00:00");
  });
});
