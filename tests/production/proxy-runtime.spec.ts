import { execFileSync } from "node:child_process";
import { test } from "@playwright/test";

test("built frontend image uses the runtime API URL and preserves HTTP transport", () => {
  const envFile = process.env.PRODUCTION_TEST_ENV_FILE;
  const project = process.env.COMPOSE_PROJECT_NAME;
  if (!envFile || !project?.startsWith("pge-identity-production-test-")) throw new Error("Use scripts/run-production-tests.sh");

  // Run the published-image entrypoint against an ephemeral backend whose port was unknown at build time.
  const script = `
    import assert from "node:assert/strict";
    import { spawn } from "node:child_process";
    import { once } from "node:events";
    import { createServer } from "node:http";
    import { setTimeout as delay } from "node:timers/promises";

    const backend = createServer(async (request, response) => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      response.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie": ["identity=test; Path=/; HttpOnly; Secure", "csrf=test; Path=/; Secure"],
      });
      response.end(JSON.stringify({
        url: request.url,
        method: request.method,
        headers: request.headers,
        body: Buffer.concat(chunks).toString(),
      }));
    });
    backend.listen(0, "127.0.0.1");
    await once(backend, "listening");
    const frontend = spawn(process.execPath, ["server.js"], {
      env: {
        ...process.env,
        API_INTERNAL_URL: "http://127.0.0.1:" + backend.address().port,
        HOSTNAME: "127.0.0.1",
        PORT: "3000",
      },
      stdio: "inherit",
    });
    try {
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        if (frontend.exitCode !== null) throw new Error("Frontend exited before readiness");
        ready = await fetch("http://127.0.0.1:3000/health").then(r => r.ok).catch(() => false);
        if (ready) break;
        await delay(100);
      }
      assert.ok(ready, "Frontend must become ready");
      for (const method of ["GET", "POST", "PUT", "DELETE"]) {
        const body = method === "GET" ? undefined : JSON.stringify({ subject: "Direito Civil" });
        const path = "/api/sessions?page=2&subject=Direito%20Civil&subject=Tribut%C3%A1rio";
        const response = await fetch("http://127.0.0.1:3000" + path, {
          method,
          headers: {
            "Content-Type": "application/json",
            "Cookie": "pge.identity=ticket",
            "X-CSRF-TOKEN": "request-token",
            "X-Forwarded-Proto": "https",
          },
          body,
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.deepEqual(response.headers.getSetCookie(), [
          "identity=test; Path=/; HttpOnly; Secure", "csrf=test; Path=/; Secure",
        ]);
        const received = await response.json();
        assert.equal(received.url, path);
        assert.equal(received.method, method);
        assert.equal(received.body, body ?? "");
        assert.equal(received.headers.cookie, "pge.identity=ticket");
        assert.equal(received.headers["x-csrf-token"], "request-token");
        assert.equal(received.headers["x-forwarded-proto"], "https");
      }
    } finally {
      const exited = once(frontend, "exit");
      if (frontend.exitCode === null) {
        frontend.kill("SIGTERM");
        await exited;
      }
      backend.closeAllConnections();
      await new Promise(resolve => backend.close(resolve));
    }
  `;
  execFileSync("docker", [
    "compose", "--env-file", envFile, "-p", project,
    "run", "--rm", "--no-deps", "-T", "app", "node", "--input-type=module", "-e", script,
  ], { stdio: "pipe", timeout: 45_000 });
});
