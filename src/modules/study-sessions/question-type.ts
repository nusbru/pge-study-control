import { QuestionType } from "@/generated/prisma/enums";

export const editableQuestionTypes = [
  QuestionType.JURISPRUDENCE,
  QuestionType.BLACK_LETTER_LAW,
  QuestionType.DOCTRINE,
] as const;

export type EditableQuestionType = (typeof editableQuestionTypes)[number];

export const questionTypeLabels: Record<QuestionType, string> = {
  [QuestionType.JURISPRUDENCE]: "Jurisprudência",
  [QuestionType.BLACK_LETTER_LAW]: "Lei Seca",
  [QuestionType.DOCTRINE]: "Doutrina",
  [QuestionType.UNSPECIFIED]: "Não informado",
};

export function isEditableQuestionType(value: unknown): value is EditableQuestionType {
  return editableQuestionTypes.some((questionType) => questionType === value);
}
