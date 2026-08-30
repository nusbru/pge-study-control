import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";
import { controlledToday, createSession, registerAndLogin, test } from "./helpers";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1_440, height: 900 },
] as const;

test("installs the controlled local date before first navigation", async ({ page }) => {
  const localToday = await page.evaluate(() => {
    const now = new Date();
    return [
      String(now.getFullYear()).padStart(4, "0"),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
  });

  expect(localToday).toBe(controlledToday);
});

async function expectAccessiblePage(page: Page, pageName: string) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth, `${pageName} must not overflow horizontally`).toBe(dimensions.clientWidth);

  const unlabeledInputs = await page.locator("input").evaluateAll((inputs) => inputs.flatMap((input) => {
    const element = input as HTMLInputElement;
    if (element.type === "hidden") return [];
    const hasAccessibleName = element.labels?.length
      || element.hasAttribute("aria-label")
      || element.hasAttribute("aria-labelledby");
    return hasAccessibleName ? [] : [element.name || element.type];
  }));
  expect(unlabeledInputs, `${pageName} inputs must have programmatic labels`).toEqual([]);

  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
  expect(violations, `${pageName} has serious or critical Axe violations:\n${JSON.stringify(violations, null, 2)}`).toEqual([]);
}

async function expectKeyboardFocusVisible(page: Page, target: Locator, controlName: string) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let press = 0; press < 50 && !await target.evaluate((element) => element === document.activeElement); press += 1) {
    await page.keyboard.press("Tab");
  }

  await expect(target, `${controlName} must be keyboard reachable`).toBeFocused();
  const focus = await target.evaluate((active) => {
    const style = getComputedStyle(active);
    return {
      focusVisible: active.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focus.focusVisible, `${controlName} must expose keyboard focus`).toBe(true);
  expect(focus.outlineStyle, `${controlName} focus must use a visible outline`).not.toBe("none");
  expect(focus.outlineWidth, `${controlName} focus outline must be at least 2px`).toBeGreaterThanOrEqual(2);
}

test("core pages remain responsive and accessible", async ({ page }) => {
  for (const viewport of viewports) {
    await test.step(`${viewport.name} login`, async () => {
      await page.setViewportSize(viewport);
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "Entre na sua conta" })).toBeVisible();
      await expectAccessiblePage(page, `${viewport.name} login`);
      await expectKeyboardFocusVisible(page, page.getByLabel("E-mail"), `${viewport.name} input`);
      await expectKeyboardFocusVisible(
        page,
        page.getByRole("button", { name: "Entrar" }),
        `${viewport.name} button`,
      );
    });

    await registerAndLogin(page, `accessibility-${viewport.name}`);

    await test.step(`${viewport.name} new session`, async () => {
      await page.goto("/sessions/new");
      await expect(page.getByRole("heading", { name: "Nova sessão" })).toBeVisible();
      await expect(page.getByRole("radio", { name: "Jurisprudência" })).toBeVisible();
      await expect(page.getByRole("radio", { name: "Lei Seca" })).toBeVisible();
      await expect(page.getByRole("radio", { name: "Doutrina" })).toBeVisible();
      await expectAccessiblePage(page, `${viewport.name} new session`);
      await expectKeyboardFocusVisible(
        page,
        page.getByRole("radio", { name: "Jurisprudência" }),
        `${viewport.name} question type radio`,
      );
    });

    await createSession(page, {
      studyDate: controlledToday,
      subject: `Acessibilidade ${viewport.name}`,
      questionType: "Jurisprudência",
      totalQuestions: "10",
      correctAnswers: "6",
    });

    await test.step(`${viewport.name} history`, async () => {
      await expect(page.getByRole("heading", { name: "Sessões de estudo" })).toBeVisible();
      await expectAccessiblePage(page, `${viewport.name} history`);
      await expectKeyboardFocusVisible(
        page,
        page.getByRole("link", { name: "Sessões", exact: true }),
        `${viewport.name} navigation link`,
      );
      await expectKeyboardFocusVisible(
        page,
        page.getByRole("button", { name: `Excluir sessão de Acessibilidade ${viewport.name}` }),
        `${viewport.name} delete action`,
      );
    });

    await test.step(`${viewport.name} dashboard`, async () => {
      await page.goto(`/dashboard?period=30d&today=${controlledToday}`);
      await expect(page).toHaveURL(new RegExp(`today=${controlledToday}`));
      await expect(page.getByRole("heading", { name: "Desempenho", exact: true })).toBeVisible();
      const typeFilters = page.getByRole("navigation", { name: "Filtrar tipo de questão" });
      await expect(typeFilters).toBeVisible();
      await expect(page.getByRole("img", {
        name: `Acessibilidade ${viewport.name}: 60,0% de acertos e 40,0% de erros em 10 questões`,
      })).toBeVisible();
      await expectAccessiblePage(page, `${viewport.name} dashboard`);
      await expectKeyboardFocusVisible(
        page,
        page.getByRole("link", { name: "30 dias", exact: true }),
        `${viewport.name} period filter`,
      );
      await expectKeyboardFocusVisible(
        page,
        typeFilters.getByRole("link", { name: "Jurisprudência" }),
        `${viewport.name} question type filter`,
      );
    });

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("a 120-character unbroken subject does not overflow mobile history", async ({ page }) => {
  const subject = "A".repeat(120);
  expect(subject).toHaveLength(120);
  await page.setViewportSize(viewports[0]);
  await registerAndLogin(page, "subject-boundary");
  await createSession(page, {
    studyDate: controlledToday,
    subject,
    questionType: "Doutrina",
    totalQuestions: "10",
    correctAnswers: "6",
  });

  await expect(page.getByRole("heading", { name: subject })).toBeVisible();
  await expectAccessiblePage(page, "mobile history with 120-character subject");
});
