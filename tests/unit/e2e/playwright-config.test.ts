import { describe, expect, it } from "vitest";
import config, { shouldReuseExistingServer } from "../../../playwright.config";
import { browserContextOptionsForProject } from "../../e2e/helpers";

describe("Playwright server isolation", () => {
  it("requires explicit local opt-in and always disables reuse in CI", () => {
    expect(shouldReuseExistingServer({})).toBe(false);
    expect(shouldReuseExistingServer({ PLAYWRIGHT_REUSE_EXISTING_SERVER: "1" })).toBe(true);
    expect(shouldReuseExistingServer({ CI: "1", PLAYWRIGHT_REUSE_EXISTING_SERVER: "1" })).toBe(false);
  });

  it("runs the production-built frontend against the API", () => {
    expect(config.webServer).toMatchObject({ command: expect.stringMatching(/^npm run start -- --hostname 127\.0\.0\.1 --port \d+$/) });
  });

  it("forwards project screen emulation to additional browser contexts", () => {
    expect(browserContextOptionsForProject({ screen: { width: 412, height: 915 }, viewport: { width: 412, height: 839 } }))
      .toMatchObject({ screen: { width: 412, height: 915 }, viewport: { width: 412, height: 839 } });
  });
});
