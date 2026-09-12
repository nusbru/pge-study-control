import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixture = await mkdtemp(join(tmpdir(), "pge-dev-container-"));
const project = `pge-local-smoke-${randomUUID()}`;
const compose = ["compose", "-p", project, "-f", join(fixture, "compose.dev.yaml")];
const env = { ...process.env, COMPOSE_PROJECT_NAME: project, APP_PORT: "0", API_PORT: "0", LOCAL_DB_PORT: "0",
  LOCAL_UID: String(process.getuid()), LOCAL_GID: String(process.getgid()) };
const docker = (...args) => execFileSync("docker", [...compose, ...args], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
let child;
let exited;
let browser;
let output = "";

try {
  // Test bind mounts and hot reload without editing the developer's working tree or copying secrets.
  for (const path of ["Dockerfile", ".dockerignore", "compose.dev.yaml", "package.json", "package-lock.json",
    "next.config.ts", "tsconfig.json", "next-env.d.ts", "global.json", "src", "backend/src",
    "backend/Directory.Build.props", "backend/Dockerfile", "scripts/run-local.sh", "scripts/start-dev-frontend.sh"]) {
    await mkdir(dirname(join(fixture, path)), { recursive: true });
    await cp(join(root, path), join(fixture, path), {
      recursive: true,
      filter: source => !source.slice(root.length).split("/").some(segment => ["bin", "obj", "generated"].includes(segment)),
    });
  }
  child = spawn("sh", [join(fixture, "scripts/run-local.sh")], { cwd: fixture, env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  exited = new Promise(resolve => child.once("close", code => resolve(code)));
  for (let attempt = 0; !output.includes("PGE Study:"); attempt++) {
    if (child.exitCode !== null || attempt >= 240) throw new Error(`Local stack failed to become ready.\n${output}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  const address = docker("port", "app", "3000");
  assert.match(address, /^127\.0\.0\.1:\d+$/);
  const origin = `http://${address}`;
  assert.equal((await fetch(`${origin}/api/health`)).status, 200);
  const appId = docker("ps", "--quiet", "app");
  const mounts = JSON.parse(execFileSync("docker", ["inspect", "--format", "{{json .Mounts}}", appId], { encoding: "utf8" }));
  for (const path of ["/app/node_modules", "/app/.next"]) assert.equal(mounts.find(mount => mount.Destination === path)?.Type, "volume");
  assert.equal(execFileSync("docker", ["exec", appId, "id", "-u"], { encoding: "utf8" }).trim(), String(process.getuid()));

  const pagePath = join(fixture, "src/app/dev-container-smoke/page.tsx");
  await mkdir(dirname(pagePath), { recursive: true });
  await writeFile(pagePath, 'export default function Page() { return <h1>Before hot reload</h1>; }\n');
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${origin}/dev-container-smoke`);
  await expect(page.getByRole("heading", { name: "Before hot reload" })).toBeVisible();
  await writeFile(pagePath, 'export default function Page() { return <h1>After hot reload</h1>; }\n');
  await expect(page.getByRole("heading", { name: "After hot reload" })).toBeVisible({ timeout: 30_000 });

  child.kill("SIGINT");
  assert.equal(await exited, 130);
  assert.equal(docker("ps", "--all", "--quiet"), "");
  const volumes = execFileSync("docker", ["volume", "ls", "--quiet", "--filter", `label=com.docker.compose.project=${project}`], { encoding: "utf8" });
  assert.match(volumes, /identity_dev_data/);
  assert.match(volumes, /frontend_dev_dependencies/);
  console.log("PASS: containerized frontend, API proxy, isolated volumes, browser hot reload and Ctrl+C cleanup");
} catch (error) {
  console.error(output);
  throw error;
} finally {
  await browser?.close();
  if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  if (exited) await exited;
  try { docker("down", "-v", "--rmi", "local"); }
  finally { await rm(fixture, { recursive: true, force: true }); }
}
