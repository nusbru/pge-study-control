import { describe, expect, it } from "vitest";
import {
  formatPercentage,
  normalizeSubject,
  percentage,
  resolveQuestionCounts,
} from "@/modules/study-sessions/domain";

describe("study-session domain", () => {
  it("normalizes case and repeated whitespace without losing display spelling", () => {
    expect(normalizeSubject("  Direito   Civil ")).toEqual({
      subject: "Direito Civil",
      subjectKey: "direito civil",
    });
  });

  it("keeps a 120-character subject when lowercase normalization expands its key", () => {
    const subject = "İ".repeat(120);

    const normalized = normalizeSubject(subject);

    expect(normalized.subject).toHaveLength(120);
    expect(normalized.subjectKey).toBe("i̇".repeat(120));
    expect([...normalized.subjectKey]).toHaveLength(240);
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

  it("requires at least two count fields", () => {
    expect(() => resolveQuestionCounts({ totalQuestions: 50 }))
      .toThrow("Informe pelo menos dois valores.");
  });

  it("rejects a zero total", () => {
    expect(() => resolveQuestionCounts({ correctAnswers: 0, wrongAnswers: 0 }))
      .toThrow("O total deve ser maior que zero.");
  });

  it.each([
    { totalQuestions: -1, correctAnswers: 0 },
    { totalQuestions: 1.5, correctAnswers: 1 },
    { totalQuestions: 1_000_001, correctAnswers: 1 },
  ])("rejects invalid count input %o", (input) => {
    expect(() => resolveQuestionCounts(input))
      .toThrow("Use números inteiros entre 0 e 1.000.000.");
  });

  it("rejects a derived total above the count limit", () => {
    expect(() => resolveQuestionCounts({ correctAnswers: 1_000_000, wrongAnswers: 1_000_000 }))
      .toThrow("Use números inteiros entre 0 e 1.000.000.");
  });

  it("rounds percentages to one decimal place", () => {
    expect(percentage(2, 3)).toBe(66.7);
  });

  it.each([
    [60, "60,0%"],
    [66.7, "66,7%"],
  ])("formats percentage %s for Brazilian Portuguese", (value, expected) => {
    expect(formatPercentage(value)).toBe(expected);
  });
});
