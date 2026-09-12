import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn, spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function eventually(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.fail("Timed out waiting for the controlled Compose process");
}

async function localRunner(t, overrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), "pge-container-local-"));
  await mkdir(join(directory, "scripts"));
  await mkdir(join(directory, "bin"));
  await copyFile(new URL("../../scripts/run-local.sh", import.meta.url), join(directory, "scripts/run-local.sh"));
  const log = join(directory, "commands.jsonl");
  const ready = join(directory, "ready");
  await writeFile(log, "");
  await writeFile(join(directory, "bin/docker"), `#!${process.execPath}
const { appendFileSync, writeFileSync } = require('node:fs');
const args = process.argv.slice(2);
const command = args[5];
appendFileSync(process.env.HARNESS_LOG, JSON.stringify({ args, uid: process.env.LOCAL_UID,
  gid: process.env.LOCAL_GID, port: process.env.APP_PORT, api: process.env.API_PORT, db: process.env.LOCAL_DB_PORT }) + '\\n');
if (command === 'down') process.exit(Number(process.env.DOWN_STATUS || 0));
if (command === 'up' && process.env.UP_STATUS) process.exit(Number(process.env.UP_STATUS));
if (command === 'logs' && process.env.LOGS_STATUS) process.exit(Number(process.env.LOGS_STATUS));
if (command === 'logs' || process.env.WAIT_AT === command) {
  process.on('SIGTERM', () => process.exit(0));
  writeFileSync(process.env.HARNESS_READY, command);
  setInterval(() => {}, 1000);
}
`, { mode: 0o755 });
  await writeFile(join(directory, "bin/npm"), "#!/bin/sh\nprintf 'Unexpected host npm call' >&2\nexit 99\n", { mode: 0o755 });
  const child = spawn("sh", [join(directory, "scripts/run-local.sh")], {
    cwd: tmpdir(),
    env: {
      ...process.env,
      COMPOSE_PROJECT_NAME: "pge-local-test",
      APP_PORT: "3100", API_PORT: "5081", LOCAL_DB_PORT: "55432",
      LOCAL_UID: "1234", LOCAL_GID: "5678",
      HARNESS_LOG: log, HARNESS_READY: ready,
      PATH: `${join(directory, "bin")}:${process.env.PATH}`,
      ...overrides,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const exited = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    await exited;
    await rm(directory, { recursive: true, force: true });
  });
  return {
    child, exited, directory,
    output: () => output,
    ready: () => readFile(ready, "utf8").catch(() => ""),
    commands: async () => (await readFile(log, "utf8")).trim().split("\n").filter(Boolean).map(JSON.parse),
  };
}

test("starts all containers, waits for health and follows logs without host npm", async t => {
  const runner = await localRunner(t, { LOGS_STATUS: "0" });
  assert.equal((await runner.exited).code, 0);
  const commands = await runner.commands();
  assert.deepEqual(commands.map(command => command.args.slice(5)), [
    ["up", "-d", "--build", "--wait"], ["logs", "--follow", "--tail=50", "app", "api"], ["down"],
  ]);
  for (const command of commands) {
    assert.deepEqual(command.args.slice(0, 5), ["compose", "-p", "pge-local-test", "-f", join(runner.directory, "compose.dev.yaml")]);
    assert.deepEqual([command.uid, command.gid, command.port, command.api, command.db], ["1234", "5678", "3100", "5081", "55432"]);
  }
  assert.match(runner.output(), /http:\/\/localhost:3100/);
});

for (const [failure, code] of [["UP_STATUS", 41], ["LOGS_STATUS", 37]]) {
  test(`preserves ${failure} and cleans only its project even if cleanup fails`, async t => {
    const runner = await localRunner(t, { [failure]: String(code), DOWN_STATUS: "92" });
    assert.equal((await runner.exited).code, code);
    const commands = await runner.commands();
    assert.equal(commands.filter(command => command.args[5] === "down").length, 1);
    assert.deepEqual(commands.at(-1).args.slice(5), ["down"]);
  });
}

for (const [signal, code] of [["SIGHUP", 129], ["SIGINT", 130], ["SIGTERM", 143]]) {
  for (const phase of ["up", "logs"]) {
    test(`${signal} during ${phase} stops the CLI and retains volumes`, async t => {
      const runner = await localRunner(t, { WAIT_AT: phase });
      await eventually(async () => await runner.ready() === phase);
      runner.child.kill(signal);
      assert.equal((await runner.exited).code, code);
      const commands = await runner.commands();
      assert.deepEqual(commands.at(-1).args.slice(5), ["down"]);
      assert.equal(commands.filter(command => command.args[5] === "down").length, 1);
    });
  }
}

test("development dependencies refresh only when the mounted lockfile changes", async t => {
  const directory = await mkdtemp(join(tmpdir(), "pge-dev-dependencies-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, "node_modules"));
  await mkdir(join(directory, "bin"));
  await copyFile(new URL("../../scripts/start-dev-frontend.sh", import.meta.url), join(directory, "start.sh"));
  const log = join(directory, "npm.log");
  await writeFile(join(directory, "bin/npm"), `#!/bin/sh
printf '%s\\n' "$*" >> "$NPM_LOG"
if [ "$1" = ci ]; then exit "\${CI_STATUS:-0}"; fi
`, { mode: 0o755 });
  const lockfile = "initial dependency set";
  await writeFile(join(directory, "package-lock.json"), lockfile);
  await writeFile(join(directory, "node_modules/.package-lock.sha256"), `${createHash("sha256").update(lockfile).digest("hex")}  package-lock.json\n`);
  const run = (env = {}) => spawnSync("sh", ["start.sh"], { cwd: directory, encoding: "utf8",
    env: { ...process.env, PATH: `${join(directory, "bin")}:${process.env.PATH}`, NPM_LOG: log, ...env } });
  assert.equal(run().status, 0);
  await writeFile(join(directory, "package-lock.json"), "new dependency set");
  assert.equal(run({ CI_STATUS: "39" }).status, 39);
  assert.equal(run().status, 0);
  assert.equal(run().status, 0);
  assert.deepEqual((await readFile(log, "utf8")).trim().split("\n"), [
    "run dev -- --hostname 0.0.0.0 --port 3000", "ci", "ci",
    "run dev -- --hostname 0.0.0.0 --port 3000", "run dev -- --hostname 0.0.0.0 --port 3000",
  ]);
});
