import { defineConfig, devices } from "@playwright/test";

const databaseUrl = "postgresql://pge:pge_test_only@127.0.0.1:5433/pge_test";
const authSecret = "test-only-auth-secret-at-least-32-characters";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
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
      DATABASE_URL: databaseUrl,
    },
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:3000/login",
  },
});
