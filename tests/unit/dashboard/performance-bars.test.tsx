import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PerformanceBars } from "@/modules/dashboard/performance-bars";
import type { DashboardData } from "@/modules/dashboard/queries";

afterEach(cleanup);

const dashboard: DashboardData = {
  overall: {
    totalQuestions: 12,
    correctAnswers: 9,
    wrongAnswers: 3,
    correctPercentage: 75,
    wrongPercentage: 25,
  },
  subjects: [
    {
      subject: "Direito Civil",
      subjectKey: "direito civil",
      totalQuestions: 12,
      correctAnswers: 9,
      wrongAnswers: 3,
      correctPercentage: 75,
      wrongPercentage: 25,
    },
  ],
};

describe("PerformanceBars", () => {
  it("pairs proportional segments with concrete counts and an accessible text alternative", () => {
    render(<PerformanceBars data={dashboard} />);

    expect(screen.getByText("9 acertos")).toBeVisible();
    expect(screen.getByText("3 erros")).toBeVisible();
    expect(screen.getByText("12 questões")).toBeVisible();
    const bar = screen.getByRole("img", {
      name: "Direito Civil: 75,0% de acertos e 25,0% de erros em 12 questões",
    });
    const [correct, wrong] = Array.from(bar.children);
    expect(correct).toHaveStyle({ width: "75%" });
    expect(wrong).toHaveStyle({ width: "25%" });
  });

  it("teaches the next step when the selected period is empty", () => {
    render(<PerformanceBars data={{ ...dashboard, subjects: [] }} />);

    expect(screen.getByRole("heading", { name: "Ainda não há desempenho neste período" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Registrar uma sessão" })).toHaveAttribute(
      "href",
      "/sessions/new",
    );
  });
});
