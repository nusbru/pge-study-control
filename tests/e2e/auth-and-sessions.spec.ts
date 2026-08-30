import { expect } from "@playwright/test";
import {
  browserContextOptionsForProject,
  controlledToday,
  createSession,
  freezePageClock,
  registerAndLogin,
  test,
} from "./helpers";

const countFields = {
  total: { name: "Total de questões", value: "50" },
  correct: { name: "Acertos", value: "30" },
  wrong: { name: "Erros", value: "20" },
} as const;

test("candidate registers, records, edits, and deletes a study session", async ({ page }) => {
  await registerAndLogin(page, "complete-flow");

  await page.getByRole("link", { name: "Nova sessão" }).click();
  await page.getByLabel("Data do estudo").fill(controlledToday);
  await page.getByLabel("Assunto").fill("Direito Constitucional");
  await page.getByRole("radio", { name: "Jurisprudência" }).check();
  await page.getByRole("spinbutton", { name: "Total de questões", exact: true }).fill("50");
  await page.getByRole("spinbutton", { name: "Acertos", exact: true }).fill("30");
  await expect(page.getByRole("spinbutton", { name: "Erros", exact: true })).toHaveValue("20");
  await page.getByRole("button", { name: "Salvar sessão" }).click();

  await expect(page).toHaveURL(/\/sessions$/);
  const createdSession = page.getByRole("listitem").filter({ hasText: "Direito Constitucional" });
  await expect(createdSession).toContainText("Jurisprudência");

  await createdSession.getByRole("link", { name: "Ver detalhes" }).click();
  await expect(page.getByRole("heading", { name: "Detalhes da sessão" })).toBeVisible();
  await expect(page.getByText("Jurisprudência", { exact: true })).toBeVisible();

  await page.goto(`/dashboard?period=30d&today=${controlledToday}`);
  await expect(page).toHaveURL(new RegExp(`today=${controlledToday}`));
  const subjectPerformance = page.getByRole("listitem").filter({ hasText: "Direito Constitucional" });
  await expect(subjectPerformance).toContainText("60,0%");
  await expect(subjectPerformance).toContainText("30 acertos");
  await expect(subjectPerformance).toContainText("20 erros");

  await page.goto("/sessions");
  await page.getByRole("listitem").filter({ hasText: "Direito Constitucional" })
    .getByRole("link", { name: "Editar" }).click();
  await expect(page.getByRole("radio", { name: "Jurisprudência" })).toBeChecked();
  await page.getByRole("spinbutton", { name: "Total de questões", exact: true }).fill("40");
  await page.getByRole("spinbutton", { name: "Acertos", exact: true }).fill("30");
  await page.getByRole("spinbutton", { name: "Erros", exact: true }).fill("10");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Direito Constitucional" })).toContainText("30 (75,0%)");

  await page.goto(`/dashboard?period=30d&today=${controlledToday}`);
  const summary = page.getByRole("region", { name: "Período e resumo do desempenho" });
  await expect(summary.getByText("Questões").locator("xpath=following-sibling::dd")).toHaveText("40");
  await expect(summary.getByText("Acertos", { exact: true }).locator("xpath=following-sibling::dd"))
    .toHaveText("30 75,0%");
  await expect(summary.getByText("Erros", { exact: true }).locator("xpath=following-sibling::dd"))
    .toHaveText("10 25,0%");
  await expect(summary.getByText("Aproveitamento").locator("xpath=following-sibling::dd"))
    .toHaveText("75,0% 30 de 40");

  await page.goto("/sessions");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir sessão de Direito Constitucional" }).click();
  await expect(page.getByRole("heading", { name: "Seu histórico começa com uma sessão" })).toBeVisible();
});

test("requires a question type when creating a study session", async ({ page }) => {
  await registerAndLogin(page, "required-question-type");
  await page.goto("/sessions/new");
  await page.getByLabel("Data do estudo").fill(controlledToday);
  await page.getByLabel("Assunto").fill("Sessão sem tipo");
  await page.getByLabel("Total de questões").fill("10");
  await page.getByLabel("Acertos").fill("6");
  await page.getByRole("button", { name: "Salvar sessão" }).click();

  await expect(page).toHaveURL(/\/sessions\/new$/);
  await expect(page.getByText("Selecione o tipo de questão.").first()).toBeVisible();
});

for (const scenario of [
  { missing: "wrong", provided: ["total", "correct"] },
  { missing: "correct", provided: ["total", "wrong"] },
  { missing: "total", provided: ["correct", "wrong"] },
] as const) {
  test(`calculates ${scenario.missing} answers from the other two values`, async ({ page }) => {
    await registerAndLogin(page, `calculation-${scenario.missing}`);
    await page.goto("/sessions/new");

    for (const field of scenario.provided) {
      const input = countFields[field];
      await page.getByRole("spinbutton", { name: input.name, exact: true }).fill(input.value);
    }

    const calculated = countFields[scenario.missing];
    await expect(page.getByRole("spinbutton", { name: calculated.name, exact: true })).toHaveValue(calculated.value);
    await expect(page.getByText("Calculado automaticamente", { exact: true })).toBeVisible();
    await page.getByLabel("Data do estudo").fill(controlledToday);
    const subject = `Cálculo ${scenario.missing}`;
    await page.getByLabel("Assunto").fill(subject);
    await page.getByRole("radio", { name: "Lei Seca" }).check();
    await page.getByRole("button", { name: "Salvar sessão" }).click();

    const persisted = page.getByRole("listitem").filter({ hasText: subject });
    await expect(persisted.getByText("Total").locator("xpath=following-sibling::dd")).toHaveText("50");
    await expect(persisted.getByText("Acertos").locator("xpath=following-sibling::dd"))
      .toHaveText("30 (60,0%)");
    await expect(persisted.getByText("Erros").locator("xpath=following-sibling::dd"))
      .toHaveText("20 (40,0%)");
  });
}

test("rejects inconsistent question counts without clearing entered values", async ({ page }) => {
  await registerAndLogin(page, "inconsistent-counts");
  await page.goto("/sessions/new");
  await page.getByLabel("Data do estudo").fill(controlledToday);
  await page.getByLabel("Assunto").fill("Direito Administrativo");
  await page.getByRole("radio", { name: "Doutrina" }).check();

  const total = page.getByRole("spinbutton", { name: "Total de questões", exact: true });
  const correct = page.getByRole("spinbutton", { name: "Acertos", exact: true });
  const wrong = page.getByRole("spinbutton", { name: "Erros", exact: true });
  await total.fill("50");
  await correct.fill("30");
  await wrong.fill("30");
  await page.getByRole("button", { name: "Salvar sessão" }).click();

  await expect(page).toHaveURL(/\/sessions\/new$/);
  await expect(page.getByText("O total deve ser igual à soma de acertos e erros.", { exact: true }).first()).toBeVisible();
  await expect(total).toHaveValue("50");
  await expect(correct).toHaveValue("30");
  await expect(wrong).toHaveValue("30");
});

test("opens optional HTTP and HTTPS resources with safe link attributes", async ({ page, context }) => {
  await registerAndLogin(page, "safe-links");
  const questionUrl = "http://questions.example/list/42";
  const errorUrl = "https://errors.example/list/42";
  await context.route(/https?:\/\/(questions|errors)\.example\/.*/, (route) => route.fulfill({
    body: "<title>Study resource</title>",
    contentType: "text/html",
  }));
  await createSession(page, {
    studyDate: controlledToday,
    subject: "Recursos seguros",
    questionType: "Lei Seca",
    totalQuestions: "10",
    correctAnswers: "6",
    questionListUrl: questionUrl,
    wrongQuestionListUrl: errorUrl,
  });

  const session = page.getByRole("listitem").filter({ hasText: "Recursos seguros" });
  for (const [name, url] of [["Lista de questões", questionUrl], ["Lista de erros", errorUrl]] as const) {
    const link = session.getByRole("link", { name });
    await expect(link).toHaveAttribute("href", url);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const popupPromise = page.waitForEvent("popup");
    await link.click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(url);
    await popup.waitForLoadState();
    await popup.close();
  }
});

test("dashboard period filters exclude old sessions", async ({ page }) => {
  await registerAndLogin(page, "dashboard-periods");
  await createSession(page, {
    studyDate: controlledToday,
    subject: "Sessão atual",
    questionType: "Jurisprudência",
    totalQuestions: "10",
    correctAnswers: "8",
  });
  await createSession(page, {
    studyDate: "2025-03-01",
    subject: "Sessão antiga",
    questionType: "Doutrina",
    totalQuestions: "20",
    correctAnswers: "10",
  });

  await page.goto(`/dashboard?period=30d&today=${controlledToday}`);
  await expect(page).toHaveURL(new RegExp(`today=${controlledToday}`));
  await expect(page.getByRole("heading", { name: "Sessão atual" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sessão antiga" })).toHaveCount(0);

  await page.getByRole("link", { name: "Tudo" }).click();
  await expect(page.getByRole("heading", { name: "Sessão atual" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sessão antiga" })).toBeVisible();
});

test("dashboard filters sessions by question type and preserves the date window", async ({ page }) => {
  await registerAndLogin(page, "dashboard-question-types");
  await createSession(page, {
    studyDate: controlledToday,
    subject: "Controle concentrado",
    questionType: "Jurisprudência",
    totalQuestions: "10",
    correctAnswers: "8",
  });
  await createSession(page, {
    studyDate: controlledToday,
    subject: "Teoria constitucional",
    questionType: "Doutrina",
    totalQuestions: "20",
    correctAnswers: "10",
  });

  await page.goto(`/dashboard?period=30d&today=${controlledToday}`);
  const typeFilters = page.getByRole("navigation", { name: "Filtrar tipo de questão" });
  const summary = page.getByRole("region", { name: "Período e resumo do desempenho" });
  const totalQuestions = summary.getByText("Questões").locator("xpath=following-sibling::dd");

  await typeFilters.getByRole("link", { name: "Jurisprudência" }).click();
  await expect(page).toHaveURL(new RegExp(
    `period=30d&today=${controlledToday}&questionType=jurisprudence`,
  ));
  await expect(totalQuestions).toHaveText("10");
  await expect(page.getByRole("heading", { name: "Controle concentrado" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Teoria constitucional" })).toHaveCount(0);

  await typeFilters.getByRole("link", { name: "Doutrina" }).click();
  await expect(totalQuestions).toHaveText("20");
  await expect(page.getByRole("heading", { name: "Controle concentrado" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Teoria constitucional" })).toBeVisible();

  await typeFilters.getByRole("link", { name: "Todos" }).click();
  await expect(totalQuestions).toHaveText("30");
  await expect(page.getByRole("heading", { name: "Controle concentrado" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Teoria constitucional" })).toBeVisible();
});

test("dashboard groups subjects after case and whitespace normalization", async ({ page }) => {
  await registerAndLogin(page, "dashboard-grouping");
  await createSession(page, {
    studyDate: "2025-04-09",
    subject: "Direito Civil",
    questionType: "Jurisprudência",
    totalQuestions: "10",
    correctAnswers: "8",
  });
  await createSession(page, {
    studyDate: controlledToday,
    subject: "direito   civil",
    questionType: "Jurisprudência",
    totalQuestions: "20",
    correctAnswers: "10",
  });

  await page.goto(`/dashboard?period=all&today=${controlledToday}`);
  await expect(page).toHaveURL(new RegExp(`today=${controlledToday}`));
  const heading = page.getByRole("heading", { name: "direito civil", exact: true });
  await expect(heading).toHaveCount(1);
  const groupedSubject = page.getByRole("listitem").filter({ has: heading });
  await expect(groupedSubject).toContainText("30 questões");
  await expect(groupedSubject).toContainText("18 acertos");
  await expect(groupedSubject).toContainText("12 erros");
  await expect(groupedSubject).toContainText("60,0%");
});

test("another authenticated user receives not found for an edit URL", async ({ page, browser }, testInfo) => {
  await registerAndLogin(page, "session-owner");
  await createSession(page, {
    studyDate: controlledToday,
    subject: "Sessão privada",
    questionType: "Doutrina",
    totalQuestions: "10",
    correctAnswers: "7",
  });
  const editPath = await page.getByRole("listitem").filter({ hasText: "Sessão privada" })
    .getByRole("link", { name: "Editar" }).getAttribute("href");
  expect(editPath).not.toBeNull();

  const secondContextOptions = browserContextOptionsForProject(testInfo.project.use);
  expect(secondContextOptions.screen).toBeDefined();
  const secondContext = await browser.newContext(secondContextOptions);
  try {
    const secondPage = await secondContext.newPage();
    await freezePageClock(secondPage);
    expect(secondPage.viewportSize()).toEqual(page.viewportSize());
    expect(await secondPage.evaluate(() => ({ width: screen.width, height: screen.height })))
      .toEqual(secondContextOptions.screen);
    expect(await secondPage.evaluate(() => navigator.userAgent))
      .toBe(await page.evaluate(() => navigator.userAgent));
    expect(await secondPage.evaluate(() => navigator.maxTouchPoints))
      .toBe(await page.evaluate(() => navigator.maxTouchPoints));
    expect(await secondPage.evaluate(() => devicePixelRatio))
      .toBe(await page.evaluate(() => devicePixelRatio));
    expect(await secondPage.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone))
      .toBe(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone));
    expect(await secondPage.evaluate(() => navigator.language))
      .toBe(await page.evaluate(() => navigator.language));
    await registerAndLogin(secondPage, "different-user");
    const response = await secondPage.goto(editPath!);
    expect(response?.status()).toBe(404);
  } finally {
    await secondContext.close();
  }
});

test("logout sends private navigation back to login", async ({ page }) => {
  await registerAndLogin(page, "logout");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/sessions");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Entre na sua conta" })).toBeVisible();
});
