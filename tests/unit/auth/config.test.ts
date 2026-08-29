import { describe, expect, it } from "vitest";
import { authCallbacks, authConfig } from "@/auth.config";

describe("Auth.js user ID callbacks", () => {
  it("uses the covered callbacks in the Auth.js configuration", () => {
    expect(authConfig.callbacks).toBe(authCallbacks);
  });

  it("copies a valid server user ID into the JWT", () => {
    const token = authCallbacks.jwt({ token: {}, user: { id: "user-1" } });

    expect(token.userId).toBe("user-1");
  });

  it("leaves the JWT user ID absent without a valid server user ID", () => {
    expect(authCallbacks.jwt({ token: {}, user: undefined }).userId).toBeUndefined();
    expect(authCallbacks.jwt({ token: {}, user: { id: "" } }).userId).toBeUndefined();
  });

  it("exposes only a runtime-validated JWT user ID in the session", () => {
    const session = { user: { email: "student@example.com" }, expires: "2099-01-01" };

    expect(authCallbacks.session({ session, token: { userId: "user-1" } }).user.id).toBe("user-1");

    const malformedSession = { user: { email: "student@example.com" }, expires: "2099-01-01" };
    const malformedToken = { userId: 42 } as unknown as { userId?: string };
    expect(authCallbacks.session({ session: malformedSession, token: malformedToken }).user.id).toBeUndefined();
  });
});
