import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createSession, registerAndLogin } from "./helpers";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1_440, height: 900 },
] as const;

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

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return null;
    const style = getComputedStyle(active);
    return {
      focusVisible: active.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focus?.focusVisible, `${pageName} must expose keyboard focus`).toBe(true);
  expect(focus?.outlineStyle, `${pageName} focus must use a visible outline`).not.toBe("none");
  expect(focus?.outlineWidth, `${pageName} focus outline must be at least 2px`).toBeGreaterThanOrEqual(2);

  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
  expect(violations, `${pageName} has serious or critical Axe violations:\n${JSON.stringify(violations, null, 2)}`).toEqual([]);
}

test("core pages remain responsive and accessible", async ({ page }) => {
  for (const viewport of viewports) {
    await test.step(`${viewport.name} login`, async () => {
      await page.setViewportSize(viewport);
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "Entre na sua conta" })).toBeVisible();
      await expectAccessiblePage(page, `${viewport.name} login`);
    });

    await registerAndLogin(page, `accessibility-${viewport.name}`);

    await test.step(`${viewport.name} new session`, async () => {
      await page.goto("/sessions/new");
      await expect(page.getByRole("heading", { name: "Nova sessão" })).toBeVisible();
      await expectAccessiblePage(page, `${viewport.name} new session`);
    });

    await createSession(page, {
      studyDate: "2026-08-24",
      subject: `Acessibilidade ${viewport.name}`,
      totalQuestions: "10",
      correctAnswers: "6",
    });

    await test.step(`${viewport.name} history`, async () => {
      await expect(page.getByRole("heading", { name: "Sessões de estudo" })).toBeVisible();
      await expectAccessiblePage(page, `${viewport.name} history`);
    });

    await test.step(`${viewport.name} dashboard`, async () => {
      await page.goto("/dashboard?period=30d&today=2026-08-24");
      await expect(page.getByRole("heading", { name: "Desempenho", exact: true })).toBeVisible();
      await expect(page.getByRole("img", {
        name: `Acessibilidade ${viewport.name}: 60,0% de acertos e 40,0% de erros em 10 questões`,
      })).toBeVisible();
      await expectAccessiblePage(page, `${viewport.name} dashboard`);
    });

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);
  }
});
