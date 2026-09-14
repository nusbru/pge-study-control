import { z } from "zod";

const count = z.number({ error: "Informe um número inteiro." }).int("Informe um número inteiro.")
  .min(0, "O valor não pode ser negativo.").max(1_000_000, "Use até 1.000.000 questões.");

export const mockExamSchema = z.object({
  examDate: z.iso.date({ error: "Informe uma data válida." }).refine(value => !value.startsWith("0000"), "Informe uma data válida."),
  totalQuestions: count.min(1, "Informe pelo menos uma questão."),
  isHistorical: z.boolean(),
  correctAnswers: count.nullable(),
  wrongAnswers: count.nullable(),
  feeling: z.enum(["CONFIDENT", "CALM", "ANXIOUS", "TIRED", "FRUSTRATED"]).nullable(),
  comment: z.string().trim().max(2000, "Use até 2.000 caracteres.").nullable(),
  startedAt: z.iso.datetime({ offset: true, error: "Informe um horário válido." }).nullable(),
  endedAt: z.iso.datetime({ offset: true, error: "Informe um horário válido." }).nullable(),
  version: z.guid().nullable(),
}).superRefine((data, ctx) => {
  for (const field of ["correctAnswers", "wrongAnswers"] as const) {
    if (data[field] !== null && data[field] > data.totalQuestions)
      ctx.addIssue({ code: "custom", path: [field], message: "O resultado não pode superar o total de questões." });
  }
  if (data.correctAnswers !== null && data.wrongAnswers !== null && data.correctAnswers + data.wrongAnswers !== data.totalQuestions)
    ctx.addIssue({ code: "custom", path: ["correctAnswers"], message: "Acertos e erros devem somar o total de questões." });
  if (data.isHistorical && Boolean(data.startedAt) !== Boolean(data.endedAt))
    ctx.addIssue({ code: "custom", path: ["endedAt"], message: "Informe início e fim ou deixe ambos em branco." });
  if (data.startedAt && data.endedAt && Date.parse(data.endedAt) < Date.parse(data.startedAt))
    ctx.addIssue({ code: "custom", path: ["endedAt"], message: "O fim deve ser igual ou posterior ao início." });
});
