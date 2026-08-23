import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("identifies the product and offers authentication", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /pge study/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /entrar/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /criar conta/i })).toHaveAttribute("href", "/register");
  });
});
