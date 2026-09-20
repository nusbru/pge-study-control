import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(protected)/dashboard/page";
import { QuestionType } from "@/lib/api/contracts";
import type { DashboardData } from "@/modules/dashboard/queries";
import { constitutionalism, subjects } from "../../subjects";

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
  getMockExamPerformance: vi.fn(),
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

vi.mock("@/modules/study-sessions/repository", () => ({ listSubjects: async () => subjects }));

vi.mock("@/modules/mock-exams/queries", () => ({ getMockExamPerformance: mocks.getMockExamPerformance }));

beforeEach(() => {
  process.env.TZ = "UTC";
  mocks.getDashboard.mockResolvedValue(dashboard);
  mocks.getMockExamPerformance.mockResolvedValue({ completedCount: 0, correctedCount: 0, timedCount: 0,
    totalDurationSeconds: 0, averageDurationSeconds: null, overall: dashboard.overall, recent: [] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  process.env.TZ = originalTimezone;
  mocks.getDashboard.mockReset();
  mocks.getMockExamPerformance.mockReset();
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
      "Não disponível Sem questões nos filtros selecionados",
    );
  });

  it("filters by question type and preserves the dashboard window in filter links", async () => {
    const page = await DashboardPage({
      searchParams: Promise.resolve({
        period: "30d",
        today: "2026-08-24",
        questionType: "doctrine",
      }),
    });

    render(page);

    expect(mocks.getDashboard).toHaveBeenCalledWith(
      "30d",
      "2026-08-24",
      QuestionType.DOCTRINE,
      undefined,
    );
    expect(mocks.getMockExamPerformance).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Desempenho nos simulados" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sessões de estudo" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Simulados" })).toHaveAttribute(
      "href", "/dashboard?period=30d&today=2026-08-24&questionType=doctrine&tab=simulados",
    );
    expect(screen.getByRole("link", { name: "Doutrina" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Lei Seca" })).toHaveAttribute(
      "href",
      "/dashboard?period=30d&today=2026-08-24&questionType=black-letter-law",
    );
    expect(screen.getByRole("link", { name: "90 dias" })).toHaveAttribute(
      "href",
      "/dashboard?period=90d&today=2026-08-24&questionType=doctrine",
    );
  });

  it("defaults an invalid question type to all", async () => {
    const page = await DashboardPage({
      searchParams: Promise.resolve({
        period: "30d",
        today: "2026-08-24",
        questionType: "invalid",
      }),
    });

    render(page);

    expect(mocks.getDashboard).toHaveBeenCalledWith("30d", "2026-08-24", "all", undefined);
    expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute("aria-current", "page");
  });

  it("loads only mock exams and preserves the active tab and session filter in navigation", async () => {
    render(await DashboardPage({ searchParams: Promise.resolve({
      tab: "simulados", period: "90d", today: "2026-08-24", questionType: "doctrine",
    }) }));

    expect(mocks.getDashboard).not.toHaveBeenCalled();
    expect(mocks.getMockExamPerformance).toHaveBeenCalledWith("90d", "2026-08-24");
    expect(screen.getByRole("link", { name: "Simulados" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Desempenho nos simulados" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Filtrar tipo de questão" })).not.toBeInTheDocument();
    expect(screen.queryByText("Questões", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nova sessão" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Novo simulado" })).toHaveAttribute("href", "/simulados/new");
    expect(screen.getByRole("link", { name: "7 dias" })).toHaveAttribute(
      "href", "/dashboard?period=7d&today=2026-08-24&questionType=doctrine&tab=simulados",
    );
    expect(screen.getByRole("link", { name: "Sessões de estudo" })).toHaveAttribute(
      "href", "/dashboard?period=90d&today=2026-08-24&questionType=doctrine",
    );
  });

  it.each([undefined, "invalid", ["simulados", "sessoes"]])("defaults tab %j to study sessions", async tab => {
    render(await DashboardPage({ searchParams: Promise.resolve({ tab, today: "2026-08-24" }) }));
    expect(mocks.getDashboard).toHaveBeenCalledOnce();
    expect(mocks.getMockExamPerformance).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Sessões de estudo" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps the mock exam tab while resolving a missing local date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00Z"));
    render(await DashboardPage({ searchParams: Promise.resolve({ tab: "simulados", period: "7d" }) }));
    expect(mocks.getDashboard).not.toHaveBeenCalled();
    expect(mocks.getMockExamPerformance).not.toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith(
      "/dashboard?period=7d&today=2026-08-24&questionType=all&tab=simulados", { scroll: false },
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
      "/dashboard?period=90d&today=2026-08-24&questionType=all",
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
      `/dashboard?period=${period}&today=2026-08-24&questionType=all`,
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
    expect(mocks.getDashboard).toHaveBeenCalledWith(period, today, "all", undefined);
  });

  it("propagates a dashboard query failure for a valid window", async () => {
    const databaseError = new Error("database unavailable");
    mocks.getDashboard.mockRejectedValueOnce(databaseError);

    await expect(DashboardPage({
      searchParams: Promise.resolve({ period: "7d", today: "2026-08-24" }),
    })).rejects.toBe(databaseError);
  });

  it("combines the subject with the period and type and retains it in navigation", async () => {
    render(await DashboardPage({ searchParams: Promise.resolve({
      period: "7d", today: "2026-08-24", questionType: "doctrine", subjectId: constitutionalism.id,
    }) }));

    expect(mocks.getDashboard).toHaveBeenCalledWith("7d", "2026-08-24", QuestionType.DOCTRINE, constitutionalism.id);
    expect(screen.getByRole("combobox", { name: "Assunto" })).toHaveValue(constitutionalism.id);
    for (const name of ["90 dias", "Lei Seca", "Simulados"]) {
      const href = screen.getByRole("link", { name }).getAttribute("href")!;
      expect(new URL(href, "https://example.com").searchParams.get("subjectId")).toBe(constitutionalism.id);
    }
    expect(screen.getByRole("heading", { name: "Nenhuma sessão encontrada para os filtros selecionados" })).toBeVisible();
  });

  it("retains the subject in the mock exam tab without filtering mock exams", async () => {
    render(await DashboardPage({ searchParams: Promise.resolve({
      tab: "simulados", period: "7d", today: "2026-08-24", subjectId: constitutionalism.id,
    }) }));
    expect(mocks.getDashboard).not.toHaveBeenCalled();
    expect(mocks.getMockExamPerformance).toHaveBeenCalledWith("7d", "2026-08-24");
    expect(screen.queryByRole("combobox", { name: "Assunto" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sessões de estudo" })).toHaveAttribute("href",
      `/dashboard?period=7d&today=2026-08-24&questionType=all&subjectId=${constitutionalism.id}`);
  });
});
