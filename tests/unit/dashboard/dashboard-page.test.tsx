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

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/auth-user", () => ({
  requireUserId: async () => "user-1",
}));

vi.mock("@/modules/dashboard/queries", () => ({
  getDashboard: async () => dashboard,
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  mocks.replace.mockReset();
});

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

  it("reconciles a valid stale query date from the rendered dashboard", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00.000Z"));
    const page = await DashboardPage({
      searchParams: Promise.resolve({ period: "90d", today: "2026-08-23" }),
    });

    render(page);

    expect(mocks.replace).toHaveBeenCalledWith(
      "/dashboard?period=90d&today=2026-08-24",
      { scroll: false },
    );
  });
});
