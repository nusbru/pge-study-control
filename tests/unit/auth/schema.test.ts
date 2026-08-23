import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/modules/auth/schema";

const validCredentials = {
  email: "student@example.com",
  password: "correct horse",
};

function expectFieldError(
  input: Record<string, unknown>,
  field: "email" | "password",
) {
  const result = registerSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) throw new Error("A validação deveria falhar.");
  expect(result.error.flatten().fieldErrors[field]).toBeDefined();
}

describe("auth schemas", () => {
  it("trims and lowercases the email", () => {
    expect(registerSchema.parse({
      ...validCredentials,
      email: " Student@Example.COM ",
    })).toEqual({
      email: "student@example.com",
      password: "correct horse",
    });
  });

  it.each([
    "not-an-email",
    `${"a".repeat(255)}@example.com`,
  ])("rejects invalid email %s", (email) => {
    expectFieldError({ ...validCredentials, email }, "email");
  });

  it.each([7, 129])("rejects a password with %i characters", (length) => {
    expectFieldError({ ...validCredentials, password: "a".repeat(length) }, "password");
  });

  it.each([8, 128])("accepts a password with %i characters", (length) => {
    expect(registerSchema.safeParse({
      ...validCredentials,
      password: "a".repeat(length),
    }).success).toBe(true);
  });

  it("applies the same normalization to login credentials", () => {
    expect(loginSchema.parse({
      email: " Student@Example.COM ",
      password: "correct horse",
    }).email).toBe("student@example.com");
  });
});
