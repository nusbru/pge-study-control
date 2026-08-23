import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireUserId } from "@/lib/auth-user";

const redirectError = new Error("REDIRECT_TO_LOGIN");
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(() => { throw redirectError; }),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

describe("requireUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the authenticated server session user ID", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(requireUserId()).resolves.toBe("user-1");
  });

  it.each([
    null,
    { user: {} },
    { user: { id: 42 } },
  ])("rejects a missing or malformed authenticated identity", async (session) => {
    mocks.auth.mockResolvedValue(session);

    await expect(requireUserId()).rejects.toBe(redirectError);
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
