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

function expectFieldError(input: Record<string, unknown>, field: string, message: string) {
  const result = studySessionInputSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) throw new Error("A validação deveria falhar.");
  expect(result.error.issues).toContainEqual(expect.objectContaining({ path: [field], message }));
}

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
    expectFieldError(
      { ...valid, questionListUrl: url },
      "questionListUrl",
      "Informe uma URL HTTP ou HTTPS válida.",
    );
  });

  it("rejects an impossible calendar date", () => {
    expectFieldError({ ...valid, studyDate: "2026-02-31" }, "studyDate", "Informe uma data válida.");
  });

  it.each(["não-numérico", "1.5", "-1", "1000001"])(
    "rejects count value %s with a Portuguese field error",
    (totalQuestions) => {
      expectFieldError(
        { ...valid, totalQuestions },
        "totalQuestions",
        "Use números inteiros entre 0 e 1.000.000.",
      );
    },
  );

  it.each([
    ["studyDate", 20260823, "Informe uma data válida."],
    ["subject", 42, "Informe um assunto com até 120 caracteres."],
    ["totalQuestions", true, "Use números inteiros entre 0 e 1.000.000."],
    ["questionListUrl", 42, "Informe uma URL HTTP ou HTTPS válida."],
    ["questionListUrl", `https://example.com/${"a".repeat(2_048)}`, "Informe uma URL HTTP ou HTTPS válida."],
  ])("reports invalid %s input in Portuguese", (field, value, message) => {
    expectFieldError({ ...valid, [field]: value }, field, message);
  });

  it("rejects a derived count above the limit in Portuguese", () => {
    const result = studySessionInputSchema.safeParse({
      ...valid,
      totalQuestions: "",
      correctAnswers: "1000000",
      wrongAnswers: "1000000",
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("A validação deveria falhar.");
    expect(result.error.issues).toContainEqual(expect.objectContaining({
      message: "Use números inteiros entre 0 e 1.000.000.",
    }));
  });

  it("reports invalid root input in Portuguese", () => {
    const result = studySessionInputSchema.safeParse(null);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("A validação deveria falhar.");
    expect(result.error.issues).toContainEqual(expect.objectContaining({
      path: [],
      message: "Dados inválidos.",
    }));
  });
});
