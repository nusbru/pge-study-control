import { expect } from "@playwright/test";
import { constitutionalism, constituentPower, constitutionalReview } from "../subjects";
import { controlledToday, createSession, registerAndLogin, test } from "./helpers";

test("subject filters compose with dashboard filters and narrow session history", async ({ page }) => {
  await registerAndLogin(page, "subject-filters");
  for (const input of [
    { subject: constitutionalism.subject, studyDate: controlledToday, questionType: "Doutrina", totalQuestions: "10", correctAnswers: "8" },
    { subject: constitutionalism.subject, studyDate: controlledToday, questionType: "Jurisprudência", totalQuestions: "20", correctAnswers: "10" },
    { subject: constitutionalism.subject, studyDate: "2025-03-01", questionType: "Doutrina", totalQuestions: "40", correctAnswers: "30" },
    { subject: constituentPower.subject, studyDate: controlledToday, questionType: "Doutrina", totalQuestions: "30", correctAnswers: "15" },
  ] as const) await createSession(page, input);

  await page.goto(`/dashboard?period=7d&today=${controlledToday}&questionType=doctrine`);
  const subjectFilter = page.getByRole("combobox", { name: "Assunto" });
  await subjectFilter.selectOption(constitutionalism.id);
  const total = page.getByRole("region", { name: "Filtros e resumo do desempenho" })
    .getByText("Questões", { exact: true }).locator("xpath=following-sibling::dd");
  await expect(total).toHaveText("10");
  await expect(page.getByRole("heading", { name: constituentPower.subject })).toHaveCount(0);
  await expect(page).toHaveURL(url => url.searchParams.get("subjectId") === constitutionalism.id
    && url.searchParams.get("questionType") === "doctrine" && url.searchParams.get("period") === "7d");

  await page.getByRole("link", { name: "Tudo", exact: true }).click();
  await expect(total).toHaveText("50");
  await expect(subjectFilter).toHaveValue(constitutionalism.id);
  await page.getByRole("link", { name: "Jurisprudência", exact: true }).click();
  await expect(total).toHaveText("20");
  await expect(subjectFilter).toHaveValue(constitutionalism.id);

  await page.getByRole("navigation", { name: "Abas do dashboard" }).getByRole("link", { name: "Simulados" }).click();
  await expect(subjectFilter).toHaveCount(0);
  await page.getByRole("link", { name: "Sessões de estudo", exact: true }).click();
  await expect(subjectFilter).toHaveValue(constitutionalism.id);
  await expect(total).toHaveText("20");
  await subjectFilter.selectOption(constituentPower.id);
  await expect(page.getByRole("heading", { name: "Nenhuma sessão encontrada para os filtros selecionados" })).toBeVisible();
  await subjectFilter.selectOption("");
  await expect(total).toHaveText("20");
  await expect(page).toHaveURL(url => !url.searchParams.has("subjectId"));

  await page.goto("/sessions?page=3");
  await subjectFilter.selectOption(constitutionalism.id);
  await expect(page).toHaveURL(url => url.searchParams.get("subjectId") === constitutionalism.id && !url.searchParams.has("page"));
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await page.reload();
  await expect(subjectFilter).toHaveValue(constitutionalism.id);
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await subjectFilter.selectOption(constitutionalReview.id);
  await expect(page.getByRole("heading", { name: "Nenhuma sessão encontrada para este assunto" })).toBeVisible();
  await page.getByRole("link", { name: "Ver todos os assuntos" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(4);
  await expect(subjectFilter).toHaveValue("");
});
