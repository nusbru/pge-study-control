import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = new URL("../src/lib/api/generated.d.ts", import.meta.url);
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const api = spawn("dotnet", ["run", "--project", "backend/src/PgeStudy.Host", "--no-launch-profile", "--", "--urls", `http://127.0.0.1:${port}`], {
  cwd: root,
  env: { ...process.env, ASPNETCORE_ENVIRONMENT: "Development", ConnectionStrings__Database: "Host=localhost;Database=schema_only;Username=pge;Password=unused" },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
api.stdout.on("data", (chunk) => { logs += chunk; });
api.stderr.on("data", (chunk) => { logs += chunk; });
try {
  const url = `http://127.0.0.1:${port}/api/openapi/v1.json`;
  let schema;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (api.exitCode !== null) throw new Error(logs);
    try {
      const response = await fetch(url);
      if (response.ok) { schema = await response.json(); break; }
    } catch { /* Wait until the API is listening. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!schema) throw new Error(`OpenAPI endpoint did not become ready.\n${logs}`);
  const generated = `// Generated from ASP.NET Core OpenAPI. Run npm run api:types.\n${astToString(await openapiTS(schema))}`;
  if (process.argv.includes("--check")) {
    if (await readFile(output, "utf8") !== generated) throw new Error("API types are stale. Run npm run api:types.");
  } else {
    await writeFile(output, generated);
  }
} finally {
  api.kill("SIGTERM");
  await new Promise((resolve) => api.exitCode !== null ? resolve() : api.once("exit", resolve));
}
