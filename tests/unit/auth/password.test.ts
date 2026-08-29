import { getRounds } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/modules/auth/password";

describe("password hashing", () => {
  it("verifies the original password and rejects another password", async () => {
    const passwordHash = await hashPassword("correct horse");

    await expect(verifyPassword("correct horse", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong horse", passwordHash)).resolves.toBe(false);
    expect(getRounds(passwordHash)).toBe(12);
  });

  it("distinguishes passwords that differ only after UTF-8 byte 72", async () => {
    const sharedBytes = "a".repeat(72);
    const firstPassword = `${sharedBytes}x`;
    const secondPassword = `${sharedBytes}y`;
    const passwordHash = await hashPassword(firstPassword);

    await expect(verifyPassword(firstPassword, passwordHash)).resolves.toBe(true);
    await expect(verifyPassword(secondPassword, passwordHash)).resolves.toBe(false);
  });
});
