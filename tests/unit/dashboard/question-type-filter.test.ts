import { describe, expect, it } from "vitest";
import { QuestionType } from "@/generated/prisma/enums";
import {
  parseDashboardQuestionType,
  serializeDashboardQuestionType,
  type DashboardQuestionType,
} from "@/modules/dashboard/question-type-filter";

describe("dashboard question type filter", () => {
  it.each([
    ["all", "all"],
    ["jurisprudence", QuestionType.JURISPRUDENCE],
    ["black-letter-law", QuestionType.BLACK_LETTER_LAW],
    ["doctrine", QuestionType.DOCTRINE],
    ["unspecified", QuestionType.UNSPECIFIED],
    [undefined, "all"],
    ["unknown", "all"],
    ["toString", "all"],
    ["constructor", "all"],
    ["__proto__", "all"],
    [["doctrine"], "all"],
  ])("parses %j as %s", (input, expected) => {
    expect(parseDashboardQuestionType(input)).toBe(expected);
  });

  it.each([
    ["all", "all"],
    [QuestionType.JURISPRUDENCE, "jurisprudence"],
    [QuestionType.BLACK_LETTER_LAW, "black-letter-law"],
    [QuestionType.DOCTRINE, "doctrine"],
    [QuestionType.UNSPECIFIED, "unspecified"],
  ])("serializes %s as %s", (input, expected) => {
    expect(serializeDashboardQuestionType(input as DashboardQuestionType)).toBe(expected);
  });
});
