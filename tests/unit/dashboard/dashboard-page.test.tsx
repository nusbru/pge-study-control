import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
const originalTimezone = process.env.TZ;

const mocks = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/auth-user", () => ({
  requireUserId: async () => "user-1",
}));

vi.mock("@/modules/dashboard/queries", () => ({
  getDashboard: mocks.getDashboard,
}));

beforeEach(() => {
  process.env.TZ = "UTC";
  mocks.getDashboard.mockResolvedValue(dashboard);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  process.env.TZ = originalTimezone;
  mocks.getDashboard.mockReset();
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

  it("renders empty counts without inventing percentages for zero questions", async () => {
    mocks.getDashboard.mockResolvedValueOnce({
      overall: {
        totalQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        correctPercentage: null,
        wrongPercentage: null,
      },
      subjects: [],
    });
    const page = await DashboardPage({
      searchParams: Promise.resolve({ period: "30d", today: "2026-08-24" }),
    });

    render(page);

    expect(screen.getByText("Acertos").nextElementSibling).toHaveTextContent("0");
    expect(screen.getByText("Erros").nextElementSibling).toHaveTextContent("0");
    expect(screen.queryByText("0,0%")).not.toBeInTheDocument();
    expect(screen.getByText("Aproveitamento").nextElementSibling).toHaveTextContent(
      "Não disponível Sem questões no período",
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

  it.each([
    ["missing date", "7d", undefined],
    ["invalid date", "30d", "not-a-date"],
    ["impossible 7d boundary", "7d", "0001-01-01"],
    ["impossible 30d boundary", "30d", "0001-01-01"],
    ["impossible 90d boundary", "90d", "0001-01-01"],
  ])("preflights a %s before querying", async (_case, period, today) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00.000Z"));

    const page = await DashboardPage({
      searchParams: Promise.resolve({ period, today }),
    });

    expect(mocks.getDashboard).not.toHaveBeenCalled();
    render(page);
    expect(screen.getByText("Preparando seu desempenho...")).toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith(
      `/dashboard?period=${period}&today=2026-08-24`,
      { scroll: false },
    );
  });

  it.each([
    ["7d", "0001-01-07"],
    ["30d", "0001-01-30"],
    ["90d", "0001-03-31"],
    ["all", "0001-01-01"],
  ])("queries a valid %s window ending on %s", async (period, today) => {
    await DashboardPage({ searchParams: Promise.resolve({ period, today }) });

    expect(mocks.getDashboard).toHaveBeenCalledOnce();
    expect(mocks.getDashboard).toHaveBeenCalledWith("user-1", period, today);
  });

  it("propagates a dashboard query failure for a valid window", async () => {
    const databaseError = new Error("database unavailable");
    mocks.getDashboard.mockRejectedValueOnce(databaseError);

    await expect(DashboardPage({
      searchParams: Promise.resolve({ period: "7d", today: "2026-08-24" }),
    })).rejects.toBe(databaseError);
  });
});
