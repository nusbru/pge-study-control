import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import crypto from "node:crypto";

async function browserRequest(page: Page, path: string, method = "GET") {
  // Use the browser's secure-loopback cookie behavior, not Playwright's separate HTTP client.
  return page.evaluate(async ({ path, method }) => {
    const response = await fetch(path, { method });
    return { status: response.status, cache: response.headers.get("cache-control"), body: await response.json().catch(() => null) };
  }, { path, method });
}

test("production proxy issues Secure cookies and recreated API retains authenticated sessions", async ({ page }) => {
  const email = `production-${crypto.randomUUID()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("production test password");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/login\?registered=1$/);
  expect((await browserRequest(page, "/api/auth/me")).status).toBe(401);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("production test password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  const cookie = (await page.context().cookies()).find(cookie => cookie.name === "pge.identity");
  expect(cookie).toMatchObject({ secure: true, httpOnly: true, path: "/", sameSite: "Lax" });
  await expect(page.getByRole("heading", { name: "Desempenho", exact: true })).toBeVisible();
  const me = await browserRequest(page, "/api/auth/me");
  expect(me.status).toBe(200);
  expect(me.cache).toContain("no-store");
  expect(me.body).toMatchObject({ email });
  expect((await browserRequest(page, "/api/auth/logout", "POST")).status).toBe(400);

  const envFile = process.env.PRODUCTION_TEST_ENV_FILE;
  const project = process.env.COMPOSE_PROJECT_NAME;
  if (!envFile || !project?.startsWith("pge-identity-production-test-")) throw new Error("Use scripts/run-production-tests.sh");
  execFileSync("docker", ["compose", "--env-file", envFile, "-p", project, "up", "-d", "--no-deps", "--force-recreate", "api"], { stdio: "pipe" });
  await expect.poll(async () => (await browserRequest(page, "/api/health")).status, { timeout: 30_000 }).toBe(200);
  expect((await browserRequest(page, "/api/auth/me")).status).toBe(200);
  await page.goto("/sessions");
  await expect(page.getByRole("heading", { name: "Sessões de estudo" })).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await browserRequest(page, "/api/auth/me")).status).toBe(401);
});
