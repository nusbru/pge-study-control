const origin = process.argv[2];
if (!origin) throw new Error("API origin is required");
let ready = false;
for (let attempt = 0; attempt < 90; attempt++) {
  try {
    const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(2000) });
    if (response.ok) { ready = true; break; }
  } catch { /* Allow the API time to start. */ }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready) throw new Error("API/database did not become healthy");
