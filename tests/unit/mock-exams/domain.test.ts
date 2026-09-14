import { describe, expect, it } from "vitest";
import { formatDuration } from "@/modules/mock-exams/domain";
import { mockExamSchema } from "@/modules/mock-exams/schema";

const historical = { examDate: "2026-09-14", totalQuestions: 100, isHistorical: true, correctAnswers: null,
  wrongAnswers: null, feeling: null, comment: null, startedAt: null, endedAt: null, version: null };

describe("mock exams", () => {
  it("distinguishes missing time, zero and durations longer than a day", () => {
    expect(formatDuration(null)).toBe("Tempo não informado");
    expect(formatDuration(0)).toBe("00:00:00");
    expect(formatDuration(90061.9)).toBe("25:01:01");
  });
  it.each([
    { examDate: "2026-02-30" }, { totalQuestions: 0 }, { correctAnswers: 101 }, { correctAnswers: 1.5 },
    { correctAnswers: 10, wrongAnswers: 10 }, { startedAt: "2026-09-14T10:00:00Z" },
    { startedAt: "2026-09-14T10:00:00Z", endedAt: "2026-09-14T09:00:00Z" },
    { feeling: "unknown" }, { comment: "x".repeat(2001) },
  ])("rejects invalid data %j", invalid => {
    expect(mockExamSchema.safeParse({ ...historical, ...invalid }).success).toBe(false);
  });
  it("accepts a historical exam with optional correction and timestamps in different offsets", () => {
    expect(mockExamSchema.safeParse(historical).success).toBe(true);
    expect(mockExamSchema.safeParse({ ...historical, correctAnswers: 0,
      startedAt: "2026-09-14T10:00:00-03:00", endedAt: "2026-09-14T14:00:00Z" }).success).toBe(true);
  });
});
