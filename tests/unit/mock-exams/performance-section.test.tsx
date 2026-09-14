import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MockExamPerformanceSection } from "@/modules/mock-exams/performance-section";

afterEach(cleanup);
it("explains pending corrections and unknown timing without displaying invented scores", () => {
  render(<MockExamPerformanceSection data={{ completedCount: 2, correctedCount: 0, timedCount: 0,
    totalDurationSeconds: 0, averageDurationSeconds: null,
    overall: { totalQuestions: 0, correctAnswers: 0, wrongAnswers: 0, correctPercentage: null, wrongPercentage: null }, recent: [] }} />);
  expect(screen.getByText("Correções pendentes").nextElementSibling).toHaveTextContent("2");
  expect(screen.getByText("Aproveitamento nos simulados").nextElementSibling).toHaveTextContent("Aguardando correção");
  expect(screen.getByText("Duração média").nextElementSibling).toHaveTextContent("Tempo não informado");
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
