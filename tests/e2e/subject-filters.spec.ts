import { expect } from "@playwright/test";
import { constitutionalism, constituentPower, constitutionalReview, environmentalLaw } from "../subjects";
import { controlledToday, createSession, registerAndLogin, test } from "./helpers";

test("subject filters compose with dashboard filters and narrow session history", async ({ page }) => {
  await registerAndLogin(page, "subject-filters");
  for (const input of [
    { subject: constitutionalism.subject, studyDate: controlledToday, questionType: "Doutrina", totalQuestions: "10", correctAnswers: "8" },
    { subject: constitutionalism.subject, studyDate: controlledToday, questionType: "Jurisprudência", totalQuestions: "20", correctAnswers: "10" },
    { subject: constitutionalism.subject, studyDate: "2025-03-01", questionType: "Doutrina", totalQuestions: "40", correctAnswers: "30" },
    { subject: constituentPower.subject, studyDate: controlledToday, questionType: "Doutrina", totalQuestions: "30", correctAnswers: "15" },
    { subject: environmentalLaw.subject, studyDate: controlledToday, questionType: "Doutrina", totalQuestions: "50", correctAnswers: "40" },
  ] as const) await createSession(page, input);

  await page.goto(`/dashboard?period=7d&today=${controlledToday}&questionType=doctrine`);
  const subjectFilter = page.getByRole("combobox", { name: "Assunto", exact: true });
  const total = page.getByRole("region", { name: "Filtros e resumo do desempenho" })
    .getByText("Questões", { exact: true }).locator("xpath=following-sibling::dd");
  const detailedSearch = page.locator("summary", { hasText: "Busca detalhada" });
  await expect(subjectFilter).toBeHidden();
  await detailedSearch.focus();
  await page.keyboard.press("Enter");
  const groupFilter = page.getByRole("combobox", { name: "Grupo de assunto" });
  await groupFilter.selectOption("70");
  await expect(total).toHaveText("50");
  await expect(subjectFilter.locator(`option[value="${constitutionalism.id}"]`)).toHaveCount(0);
  expect((await subjectFilter.locator('option:not([value=""])').allTextContents()).every(subject => subject.startsWith("70"))).toBe(true);
  await subjectFilter.selectOption(environmentalLaw.id);
  await expect(page).toHaveURL(url => url.searchParams.get("subjectId") === environmentalLaw.id);
  await page.reload();
  await expect(groupFilter).toHaveValue("70");
  await expect(subjectFilter).toHaveValue(environmentalLaw.id);
  await groupFilter.selectOption("10");
  await expect(total).toHaveText("40");
  await expect(subjectFilter).toHaveValue("");
  await expect(page).toHaveURL(url => !url.searchParams.has("subjectId"));
  await subjectFilter.selectOption(constitutionalism.id);
  await expect(total).toHaveText("10");
  await detailedSearch.click();
  await expect(detailedSearch).toContainText("2 filtros ativos");
  await expect(subjectFilter).toBeHidden();
  await expect(total).toHaveText("10");
  await detailedSearch.click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("heading", { name: constituentPower.subject })).toHaveCount(0);
  await expect(page).toHaveURL(url => url.searchParams.get("subjectId") === constitutionalism.id
    && url.searchParams.get("questionType") === "doctrine" && url.searchParams.get("period") === "7d"
    && url.searchParams.get("subjectGroup") === "10");

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
  await expect(groupFilter).toHaveValue("10");
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
  await expect(page.getByRole("listitem")).toHaveCount(5);
  await expect(subjectFilter).toHaveValue("");
});
