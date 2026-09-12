import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginAction, registerAction } from "@/modules/auth/actions";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ mutateApi: vi.fn(), navigateAfterMutation: vi.fn() }));
vi.mock("@/lib/api/browser", () => mocks);
beforeEach(() => vi.resetAllMocks());

function credentials() {
  const form = new FormData();
  form.set("email", " Person@Example.com ");
  form.set("password", "correct horse");
  return form;
}

describe("Identity form adapters", () => {
  it("normalizes credentials and navigates after successful login", async () => {
    await loginAction({ ok: false }, credentials());
    expect(mocks.mutateApi).toHaveBeenCalledWith("/api/auth/login", "POST", { email: "person@example.com", password: "correct horse" });
    expect(mocks.navigateAfterMutation).toHaveBeenCalledWith("/dashboard");
  });

  it("preserves the registration redirect", async () => {
    await registerAction({ ok: false }, credentials());
    expect(mocks.navigateAfterMutation).toHaveBeenCalledWith("/login?registered=1");
  });

  it("maps API field errors into the existing form contract", async () => {
    mocks.mutateApi.mockRejectedValue(new ApiError(400, { errors: { email: ["Este e-mail já está cadastrado."] } }));
    const result = await registerAction({ ok: false }, credentials());
    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.email).toEqual(["Este e-mail já está cadastrado."]);
    expect(mocks.navigateAfterMutation).not.toHaveBeenCalled();
  });
});
