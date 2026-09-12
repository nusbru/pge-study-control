import { afterEach, describe, expect, it, vi } from "vitest";
import { mutateApi } from "@/lib/api/browser";

afterEach(() => vi.unstubAllGlobals());

describe("same-origin API transport", () => {
  it("gets a fresh identity-bound CSRF token before each mutation", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ token: "anonymous-token" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ token: "user-token" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await mutateApi("/api/auth/login", "POST", { email: "person@example.com", password: "password" });
    await mutateApi("/api/auth/logout", "POST");
    expect(fetch.mock.calls[1][1]).toMatchObject({ credentials: "same-origin", headers: { "X-CSRF-TOKEN": "anonymous-token" } });
    expect(fetch.mock.calls[3][1]).toMatchObject({ credentials: "same-origin", headers: { "X-CSRF-TOKEN": "user-token" } });
  });

  it("does not issue a mutation when the CSRF handshake fails", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    await expect(mutateApi("/api/sessions", "POST", {})).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("keeps server validation details", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ token: "token" }))
      .mockResolvedValueOnce(Response.json({ errors: { subject: ["Assunto inválido"] } }, { status: 400 })));
    await expect(mutateApi("/api/sessions", "POST", {})).rejects.toMatchObject({ problem: { errors: { subject: ["Assunto inválido"] } } });
  });
});
