import { getRounds } from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { authorizeCredentials } from "@/modules/auth/authorize";
import { hashPassword, verifyPassword } from "@/modules/auth/password";

const credentials = {
  email: " Student@Example.COM ",
  password: "correct horse",
};

describe("authorizeCredentials", () => {
  it("performs password verification when the normalized email does not exist", async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(null);
    const passwordVerifier = vi.fn(verifyPassword);

    await expect(authorizeCredentials(credentials, {
      findUserByEmail,
      verifyPassword: passwordVerifier,
    })).resolves.toBeNull();

    expect(findUserByEmail).toHaveBeenCalledWith("student@example.com");
    expect(passwordVerifier).toHaveBeenCalledTimes(1);
    expect(passwordVerifier.mock.calls[0]?.[0]).toBe("correct horse");
    expect(getRounds(passwordVerifier.mock.calls[0]?.[1])).toBe(12);
  });

  it("performs password verification when the stored password is wrong", async () => {
    const passwordHash = await hashPassword("different horse");
    const findUserByEmail = vi.fn().mockResolvedValue({
      id: "user-1",
      email: "student@example.com",
      passwordHash,
    });
    const passwordVerifier = vi.fn(verifyPassword);

    await expect(authorizeCredentials(credentials, {
      findUserByEmail,
      verifyPassword: passwordVerifier,
    })).resolves.toBeNull();

    expect(passwordVerifier).toHaveBeenCalledTimes(1);
    expect(passwordVerifier).toHaveBeenCalledWith("correct horse", passwordHash);
  });

  it("returns only the server-derived identity after successful verification", async () => {
    const findUserByEmail = vi.fn().mockResolvedValue({
      id: "user-1",
      email: "student@example.com",
      passwordHash: "stored-password-hash",
    });

    await expect(authorizeCredentials(credentials, {
      findUserByEmail,
      verifyPassword: vi.fn().mockResolvedValue(true),
    })).resolves.toEqual({ id: "user-1", email: "student@example.com" });
  });
});
