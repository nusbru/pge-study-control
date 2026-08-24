import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(protected)/dashboard/page";
import type { DashboardData } from "@/modules/dashboard/queries";

const dashboard: DashboardData = {
  overall: {
    totalQuestions: 12,
    correctAnswers: 9,
    wrongAnswers: 3,
    correctPercentage: 75,
    wrongPercentage: 25,
  },
  subjects: [],
};

vi.mock("@/lib/auth-user", () => ({
  requireUserId: async () => "user-1",
}));

vi.mock("@/modules/dashboard/queries", () => ({
  getDashboard: async () => dashboard,
}));

afterEach(cleanup);

describe("DashboardPage", () => {
  it("separates summary counts from their percentage text", async () => {
    const page = await DashboardPage({
      searchParams: Promise.resolve({ period: "30d", today: "2026-08-24" }),
    });

    render(page);

    expect(screen.getByText("Acertos").nextElementSibling).toHaveTextContent("9 75,0%");
    expect(screen.getByText("Erros").nextElementSibling).toHaveTextContent("3 25,0%");
    expect(screen.getByText("Aproveitamento").nextElementSibling).toHaveTextContent(
      "75,0% 9 de 12",
    );
  });
});
