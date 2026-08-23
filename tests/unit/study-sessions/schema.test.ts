import { describe, expect, it } from "vitest";
import { studySessionInputSchema } from "@/modules/study-sessions/schema";

const valid = {
  studyDate: "2026-08-23",
  subject: "Direito Constitucional",
  totalQuestions: "50",
  correctAnswers: "30",
  wrongAnswers: "",
  questionListUrl: "https://questoes.example/lista/1",
  wrongQuestionListUrl: "",
};

describe("studySessionInputSchema", () => {
  it("parses form strings and resolves the missing count", () => {
    expect(studySessionInputSchema.parse(valid)).toMatchObject({
      studyDate: "2026-08-23",
      totalQuestions: 50,
      correctAnswers: 30,
      wrongAnswers: 20,
      wrongQuestionListUrl: null,
    });
  });

  it.each(["javascript:alert(1)", "ftp://example.com/a", "not-a-url"])("rejects unsafe URL %s", (url) => {
    expect(studySessionInputSchema.safeParse({ ...valid, questionListUrl: url }).success).toBe(false);
  });

  it("rejects an impossible calendar date", () => {
    expect(studySessionInputSchema.safeParse({ ...valid, studyDate: "2026-02-31" }).success).toBe(false);
  });
});
