import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok when PostgreSQL is reachable", async () => {
    mocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("returns a sanitized unavailable response and logs the diagnostic", async () => {
    const error = new Error("database password leaked");
    mocks.queryRaw.mockRejectedValue(error);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ status: "unavailable" });
    expect(JSON.stringify(body)).not.toContain(error.message);
    expect(consoleError).toHaveBeenCalledWith("Health check failed", error);

    consoleError.mockRestore();
  });
});
