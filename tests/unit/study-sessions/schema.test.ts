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
      subject: "Direito Constitucional",
      subjectKey: "direito constitucional",
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

  it("accepts year 0001 without remapping it to 1901", () => {
    expect(studySessionInputSchema.safeParse({ ...valid, studyDate: "0001-01-01" }).success).toBe(true);
  });

  it.each(["0000-01-01", "0001-02-29"])("rejects unsupported ancient date %s", (studyDate) => {
    expectFieldError({ ...valid, studyDate }, "studyDate", "Informe uma data válida.");
  });

  it.each(["   ", `  ${"a".repeat(121)}  `])(
    "attaches normalized subject error for %j to the subject field",
    (subject) => {
      expectFieldError(
        { ...valid, subject },
        "subject",
        "Informe um assunto com até 120 caracteres.",
      );
    },
  );

  it.each([
    ["   ", "não-numérico"],
    [`  ${"a".repeat(121)}  `, "1000001"],
  ])("reports subject and primitive count errors together", (subject, totalQuestions) => {
    const result = studySessionInputSchema.safeParse({ ...valid, subject, totalQuestions });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("A validação deveria falhar.");
    expect(result.error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: ["subject"],
        message: "Informe um assunto com até 120 caracteres.",
      }),
      expect.objectContaining({
        path: ["totalQuestions"],
        message: "Use números inteiros entre 0 e 1.000.000.",
      }),
    ]));
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
      path: [],
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
