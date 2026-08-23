import { describe, expect, it, vi } from "vitest";
import ProtectedLayout from "@/app/(protected)/layout";

const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
}));

vi.mock("@/lib/auth-user", () => ({ requireUserId: mocks.requireUserId }));

describe("ProtectedLayout", () => {
  it("propagates unauthenticated rejection before returning protected children", async () => {
    const redirectError = new Error("REDIRECT_TO_LOGIN");
    mocks.requireUserId.mockRejectedValue(redirectError);

    await expect(ProtectedLayout({ children: <p>Conteúdo privado</p> })).rejects.toBe(redirectError);
  });
});
