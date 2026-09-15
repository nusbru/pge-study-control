import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth-user", () => ({ getCurrentUser: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("identifies the product and offers authentication to anonymous visitors", async () => {
    mocks.auth.mockResolvedValue(null);

    render(await HomePage());

    expect(screen.getByRole("heading", { level: 1, name: /transforme suas questões em direção de estudo/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /pge study — página inicial/i })).toBeVisible();
    const navigation = within(screen.getByRole("navigation", { name: "Acesso à plataforma" }));
    expect(navigation.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
    expect(navigation.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/register");
  });

  it("redirects authenticated users to the dashboard", async () => {
    mocks.auth.mockResolvedValue({ id: "user-1", email: "test@example.com" });

    await HomePage();

    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });
});
