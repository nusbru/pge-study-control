import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/production",
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${process.env.APP_PORT ?? "3141"}`,
    // Simulate the scheme header an HTTPS edge overwrites before forwarding to Next.js.
    // Chromium treats loopback as a secure context; production cookie policy remains enabled.
    extraHTTPHeaders: { "X-Forwarded-Proto": "https" },
    screenshot: "only-on-failure",
  },
});
