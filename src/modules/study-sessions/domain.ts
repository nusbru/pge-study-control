export type QuestionCountInput = {
  totalQuestions?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
};

export type ResolvedQuestionCounts = Required<QuestionCountInput>;

const COUNT_MAX = 1_000_000;

export function normalizeSubject(value: string) {
  const subject = value.trim().replace(/\s+/g, " ");
  if (!subject || subject.length > 120) throw new Error("Informe um assunto com até 120 caracteres.");
  return { subject, subjectKey: subject.toLocaleLowerCase("pt-BR") };
}

export function resolveQuestionCounts(input: QuestionCountInput): ResolvedQuestionCounts {
  const entries = Object.values(input).filter((value) => value !== undefined);
  if (entries.length < 2) throw new Error("Informe pelo menos dois valores.");
  for (const value of entries) {
    if (!Number.isInteger(value) || value! < 0 || value! > COUNT_MAX) {
      throw new Error("Use números inteiros entre 0 e 1.000.000.");
    }
  }

  const totalQuestions = input.totalQuestions ?? input.correctAnswers! + input.wrongAnswers!;
  const correctAnswers = input.correctAnswers ?? totalQuestions - input.wrongAnswers!;
  const wrongAnswers = input.wrongAnswers ?? totalQuestions - correctAnswers;

  if (totalQuestions <= 0) throw new Error("O total deve ser maior que zero.");
  if (correctAnswers < 0 || wrongAnswers < 0 || totalQuestions !== correctAnswers + wrongAnswers) {
    throw new Error("O total deve ser igual à soma de acertos e erros.");
  }
  return { totalQuestions, correctAnswers, wrongAnswers };
}

export function percentage(part: number, total: number) {
  if (total <= 0) throw new Error("Não é possível calcular percentual com total zero.");
  return Math.round((part / total) * 1_000) / 10;
}
