import { defineConfig, devices } from "@playwright/test";

const authSecret = "test-only-auth-secret-at-least-32-characters";

export function databaseUrlForEnvironment(environment: Readonly<Record<string, string | undefined>>) {
  return environment.DATABASE_URL
    ?? "postgresql://pge:pge_test_only@127.0.0.1:5433/pge_test";
}

export function shouldReuseExistingServer(environment: {
  CI?: string;
  PLAYWRIGHT_REUSE_EXISTING_SERVER?: string;
}) {
  return !environment.CI && environment.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1";
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
    timezoneId: "America/Sao_Paulo",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    env: {
      AUTH_SECRET: authSecret,
      DATABASE_URL: databaseUrlForEnvironment(process.env),
    },
    reuseExistingServer: shouldReuseExistingServer({
      CI: process.env.CI,
      PLAYWRIGHT_REUSE_EXISTING_SERVER: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER,
    }),
    url: "http://127.0.0.1:3000/login",
  },
});
