import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { shouldReuseExistingServer } from "../../../playwright.config";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("Playwright server isolation", () => {
  it("requires explicit local opt-in and always disables reuse in CI", () => {
    expect(shouldReuseExistingServer({})).toBe(false);
    expect(shouldReuseExistingServer({ PLAYWRIGHT_REUSE_EXISTING_SERVER: "1" })).toBe(true);
    expect(shouldReuseExistingServer({ CI: "1", PLAYWRIGHT_REUSE_EXISTING_SERVER: "1" })).toBe(false);
  });

  it("forces server reuse off in the self-contained runner", () => {
    const directory = mkdtempSync(join(tmpdir(), "pge-e2e-runner-"));
    temporaryDirectories.push(directory);
    const capturedEnvironment = join(directory, "reuse.txt");
    writeFileSync(join(directory, "docker"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    writeFileSync(join(directory, "npx"), [
      "#!/bin/sh",
      "if [ \"$1\" = \"playwright\" ]; then",
      "  printf '%s' \"${PLAYWRIGHT_REUSE_EXISTING_SERVER-}\" > \"$CAPTURED_ENVIRONMENT\"",
      "fi",
      "exit 0",
      "",
    ].join("\n"), { mode: 0o755 });

    const result = spawnSync("sh", ["scripts/run-e2e-tests.sh", "--list"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        CAPTURED_ENVIRONMENT: capturedEnvironment,
        PATH: `${directory}:${process.env.PATH}`,
        PLAYWRIGHT_REUSE_EXISTING_SERVER: "1",
      },
    });

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(readFileSync(capturedEnvironment, "utf8")).toBe("0");
  });
});
