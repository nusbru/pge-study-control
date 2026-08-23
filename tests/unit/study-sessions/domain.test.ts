import { describe, expect, it } from "vitest";
import { normalizeSubject, percentage, resolveQuestionCounts } from "@/modules/study-sessions/domain";

describe("study-session domain", () => {
  it("normalizes case and repeated whitespace without losing display spelling", () => {
    expect(normalizeSubject("  Direito   Civil ")).toEqual({
      subject: "Direito Civil",
      subjectKey: "direito civil",
    });
  });

  it.each([
    [{ totalQuestions: 50, correctAnswers: 30 }, { totalQuestions: 50, correctAnswers: 30, wrongAnswers: 20 }],
    [{ correctAnswers: 30, wrongAnswers: 20 }, { totalQuestions: 50, correctAnswers: 30, wrongAnswers: 20 }],
    [{ totalQuestions: 50, wrongAnswers: 20 }, { totalQuestions: 50, correctAnswers: 30, wrongAnswers: 20 }],
  ])("resolves %o", (input, expected) => {
    expect(resolveQuestionCounts(input)).toEqual(expected);
  });

  it("rejects inconsistent resolved values", () => {
    expect(() => resolveQuestionCounts({ totalQuestions: 50, correctAnswers: 30, wrongAnswers: 30 }))
      .toThrow("O total deve ser igual à soma de acertos e erros.");
  });

  it("rounds percentages to one decimal place", () => {
    expect(percentage(2, 3)).toBe(66.7);
  });
});
