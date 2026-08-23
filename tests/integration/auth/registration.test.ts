import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registerUser } from "@/modules/auth/actions";
import { verifyPassword } from "@/modules/auth/password";

const duplicateEmailResult = {
  ok: false,
  fieldErrors: { email: ["Este e-mail já está cadastrado."] },
};

describe("registerUser", () => {
  beforeEach(async () => {
    await prisma.studySession.deleteMany();
    await prisma.user.deleteMany();
  });

  it("normalizes the email and stores a verifiable password hash", async () => {
    const result = await registerUser({
      email: " Student@Example.COM ",
      password: "correct horse",
    });

    expect(result).toEqual({ ok: true });
    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: "student@example.com" },
    });
    expect(stored.passwordHash).not.toBe("correct horse");
    expect(await verifyPassword("correct horse", stored.passwordHash)).toBe(true);
  });

  it("reports an email already registered", async () => {
    await registerUser(validRegistration());

    await expect(registerUser(validRegistration())).resolves.toEqual(duplicateEmailResult);
  });

  it("handles concurrent registrations for the same normalized email", async () => {
    const results = await Promise.all([
      registerUser(validRegistration(" Race@Example.COM ")),
      registerUser(validRegistration("race@example.com")),
    ]);

    expect(results).toEqual(expect.arrayContaining([{ ok: true }, duplicateEmailResult]));
    await expect(prisma.user.count({ where: { email: "race@example.com" } })).resolves.toBe(1);
  });
});

function validRegistration(email = "student@example.com") {
  return { email, password: "correct horse" };
}
