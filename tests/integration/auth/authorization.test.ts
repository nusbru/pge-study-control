import { beforeEach, describe, expect, it } from "vitest";
import { credentialsConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/modules/auth/password";

describe("Auth.js credentials configuration", () => {
  beforeEach(async () => {
    await prisma.studySession.deleteMany();
    await prisma.user.deleteMany();
  });

  it("authorizes real stored credentials and rejects the wrong password", async () => {
    const user = await prisma.user.create({
      data: {
        email: "student@example.com",
        passwordHash: await hashPassword("correct horse"),
      },
    });
    await expect(credentialsConfig.authorize({
      email: " Student@Example.COM ",
      password: "correct horse",
    })).resolves.toEqual({ id: user.id, email: "student@example.com" });
    await expect(credentialsConfig.authorize({
      email: "student@example.com",
      password: "wrong horse",
    })).resolves.toBeNull();
  });
});
