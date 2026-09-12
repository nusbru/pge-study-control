import { afterEach, describe, expect, it, vi } from "vitest";
import { serverApi } from "@/lib/api/server";

const mocks = vi.hoisted(() => ({ cookies: vi.fn(), redirect: vi.fn(() => { throw new Error("redirect"); }) }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks(); });

describe("server-rendered API transport", () => {
  it("forwards only the Identity cookie and never caches private data", async () => {
    mocks.cookies.mockResolvedValue(new Map([["pge.identity", { value: "ticket" }], ["unrelated", { value: "secret" }]]));
    const fetch = vi.fn().mockResolvedValue(Response.json({ id: "user" }));
    vi.stubGlobal("fetch", fetch);
    await serverApi("/api/auth/me");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/auth/me"), { cache: "no-store", headers: { Cookie: "pge.identity=ticket" } });
  });

  it("redirects expired private requests instead of rendering protected data", async () => {
    mocks.cookies.mockResolvedValue(new Map());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    await expect(serverApi("/api/sessions")).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("keeps an API outage distinct from an anonymous user", async () => {
    mocks.cookies.mockResolvedValue(new Map());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(serverApi("/api/auth/me", true)).rejects.toMatchObject({ status: 503 });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
