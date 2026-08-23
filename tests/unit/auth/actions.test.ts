import { AuthError, CredentialsSignin } from "@auth/core/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginAction } from "@/modules/auth/actions";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
}));

vi.mock("@/auth", () => ({ signIn: mocks.signIn }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next-auth", () => ({ AuthError }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

function loginFormData() {
  const formData = new FormData();
  formData.set("email", "student@example.com");
  formData.set("password", "correct horse");
  return formData;
}

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs in with credentials and the protected destination", async () => {
    mocks.signIn.mockResolvedValue(undefined);

    await expect(loginAction({ ok: false }, loginFormData())).resolves.toEqual({ ok: true });
    expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
      email: "student@example.com",
      password: "correct horse",
      redirectTo: "/dashboard",
    });
  });

  it("returns one generic error for invalid credentials", async () => {
    mocks.signIn.mockRejectedValue(new CredentialsSignin());

    await expect(loginAction({ ok: false }, loginFormData())).resolves.toEqual({
      ok: false,
      formError: "E-mail ou senha inválidos.",
    });
  });

  it("logs and returns a generic error for another Auth.js failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.signIn.mockRejectedValue(new AuthError("Falha interna"));

    await expect(loginAction({ ok: false }, loginFormData())).resolves.toEqual({
      ok: false,
      formError: "Não foi possível entrar. Tente novamente.",
    });
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("rethrows a non-Auth redirect exception unchanged", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/dashboard;303;",
    });
    mocks.signIn.mockRejectedValue(redirectError);

    await expect(loginAction({ ok: false }, loginFormData())).rejects.toBe(redirectError);
  });
});
