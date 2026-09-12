import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3000";
const baseURL = `http://127.0.0.1:${port}`;

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
    baseURL,
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
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    env: {
      API_INTERNAL_URL: process.env.API_INTERNAL_URL ?? "http://127.0.0.1:5080",
    },
    reuseExistingServer: shouldReuseExistingServer({
      CI: process.env.CI,
      PLAYWRIGHT_REUSE_EXISTING_SERVER: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER,
    }),
    url: `${baseURL}/login`,
  },
});
