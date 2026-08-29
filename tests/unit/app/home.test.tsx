import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("identifies the product and offers authentication to anonymous visitors", async () => {
    mocks.auth.mockResolvedValue(null);

    render(await HomePage());

    expect(screen.getByRole("heading", { name: /pge study/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /entrar/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /criar conta/i })).toHaveAttribute("href", "/register");
  });

  it("redirects authenticated users to the dashboard", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });

    await HomePage();

    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });
});
