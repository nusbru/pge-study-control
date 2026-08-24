import { expect } from "@playwright/test";
import {
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
  await page.getByRole("spinbutton", { name: "Total de questões", exact: true }).fill("50");
  await page.getByRole("spinbutton", { name: "Acertos", exact: true }).fill("30");
  await expect(page.getByRole("spinbutton", { name: "Erros", exact: true })).toHaveValue("20");
  await page.getByRole("button", { name: "Salvar sessão" }).click();

  await expect(page).toHaveURL(/\/sessions$/);
  await expect(page.getByRole("heading", { name: "Direito Constitucional" })).toBeVisible();

  await page.goto(`/dashboard?period=30d&today=${controlledToday}`);
  await expect(page).toHaveURL(new RegExp(`today=${controlledToday}`));
  const subjectPerformance = page.getByRole("listitem").filter({ hasText: "Direito Constitucional" });
  await expect(subjectPerformance).toContainText("60,0%");
  await expect(subjectPerformance).toContainText("30 acertos");
  await expect(subjectPerformance).toContainText("20 erros");

  await page.goto("/sessions");
  const session = page.getByRole("listitem").filter({ hasText: "Direito Constitucional" });
  await session.getByRole("link", { name: "Editar" }).click();
  await page.getByRole("spinbutton", { name: "Total de questões", exact: true }).fill("40");
  await page.getByRole("spinbutton", { name: "Acertos", exact: true }).fill("30");
  await page.getByRole("spinbutton", { name: "Erros", exact: true }).fill("10");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Direito Constitucional" })).toContainText("30 (75,0%)");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir sessão de Direito Constitucional" }).click();
  await expect(page.getByRole("heading", { name: "Seu histórico começa com uma sessão" })).toBeVisible();
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
  });
}

test("rejects inconsistent question counts without clearing entered values", async ({ page }) => {
  await registerAndLogin(page, "inconsistent-counts");
  await page.goto("/sessions/new");
  await page.getByLabel("Data do estudo").fill(controlledToday);
  await page.getByLabel("Assunto").fill("Direito Administrativo");

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
    totalQuestions: "10",
    correctAnswers: "8",
  });
  await createSession(page, {
    studyDate: "2025-03-01",
    subject: "Sessão antiga",
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

test("dashboard groups subjects after case and whitespace normalization", async ({ page }) => {
  await registerAndLogin(page, "dashboard-grouping");
  await createSession(page, {
    studyDate: "2025-04-09",
    subject: "Direito Civil",
    totalQuestions: "10",
    correctAnswers: "8",
  });
  await createSession(page, {
    studyDate: controlledToday,
    subject: "direito   civil",
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

test("another authenticated user receives not found for an edit URL", async ({ page, browser }) => {
  await registerAndLogin(page, "session-owner");
  await createSession(page, {
    studyDate: controlledToday,
    subject: "Sessão privada",
    totalQuestions: "10",
    correctAnswers: "7",
  });
  const editPath = await page.getByRole("listitem").filter({ hasText: "Sessão privada" })
    .getByRole("link", { name: "Editar" }).getAttribute("href");
  expect(editPath).not.toBeNull();

  const secondContext = await browser.newContext();
  try {
    const secondPage = await secondContext.newPage();
    await freezePageClock(secondPage);
    expect(secondPage.viewportSize()).toEqual(page.viewportSize());
    expect(await secondPage.evaluate(() => navigator.userAgent))
      .toBe(await page.evaluate(() => navigator.userAgent));
    expect(await secondPage.evaluate(() => navigator.maxTouchPoints))
      .toBe(await page.evaluate(() => navigator.maxTouchPoints));
    expect(await secondPage.evaluate(() => devicePixelRatio))
      .toBe(await page.evaluate(() => devicePixelRatio));
    expect(await secondPage.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone))
      .toBe(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone));
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
