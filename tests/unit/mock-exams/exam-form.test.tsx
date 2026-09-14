import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExamForm } from "@/modules/mock-exams/exam-form";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ mutateApi: vi.fn(), navigateAfterMutation: vi.fn() }));
vi.mock("@/lib/api/browser", () => mocks);
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe("ExamForm", () => {
  it("registers historical zero-score results, derives errors and preserves fields after API failure", async () => {
    const user = userEvent.setup();
    mocks.mutateApi.mockRejectedValueOnce(new ApiError(500, { title: "Tente novamente." }))
      .mockResolvedValueOnce({ id: "exam-1" });
    render(<ExamForm />);
    await user.click(screen.getByLabelText("Já realizei este simulado"));
    await user.type(screen.getByLabelText("Total de questões"), "100");
    await user.type(screen.getByLabelText("Acertos", { exact: true }), "0");
    expect(screen.getByLabelText("Erros (calculados)")).toHaveValue(100);
    await user.selectOptions(screen.getByLabelText("Sentimento (opcional)"), "CALM");
    await user.type(screen.getByLabelText("Comentário (opcional)"), "Foi difícil");
    await user.click(screen.getByRole("button", { name: "Salvar simulado" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tente novamente.");
    expect(screen.getByLabelText("Comentário (opcional)")).toHaveValue("Foi difícil");
    expect(screen.getByLabelText("Acertos", { exact: true })).toHaveValue(0);
    await user.click(screen.getByRole("button", { name: "Salvar simulado" }));
    await waitFor(() => expect(mocks.navigateAfterMutation).toHaveBeenCalledWith("/simulados/exam-1"));
    expect(mocks.mutateApi).toHaveBeenLastCalledWith("/api/mock-exams", "POST", expect.objectContaining({
      isHistorical: true, totalQuestions: 100, correctAnswers: 0, wrongAnswers: null,
      startedAt: null, endedAt: null, feeling: "CALM", comment: "Foi difícil",
    }));
  });

  it("accepts errors as input and recalculates when total changes", async () => {
    const user = userEvent.setup();
    render(<ExamForm />);
    await user.click(screen.getByLabelText("Já realizei este simulado"));
    await user.selectOptions(screen.getByLabelText("Qual resultado deseja informar?"), "wrongAnswers");
    await user.type(screen.getByLabelText("Total de questões"), "100");
    await user.type(screen.getByLabelText("Erros", { exact: true }), "30");
    expect(screen.getByLabelText("Acertos (calculados)")).toHaveValue(70);
    await user.clear(screen.getByLabelText("Total de questões"));
    await user.type(screen.getByLabelText("Total de questões"), "50");
    expect(screen.getByLabelText("Acertos (calculados)")).toHaveValue(20);
    await user.clear(screen.getByLabelText("Total de questões"));
    await user.type(screen.getByLabelText("Total de questões"), "10");
    await user.click(screen.getByRole("button", { name: "Salvar simulado" }));
    expect(screen.getByLabelText("Erros", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(mocks.mutateApi).not.toHaveBeenCalled();
  });

  it("saves an unstarted exam without treating absent results as zero", async () => {
    const user = userEvent.setup();
    mocks.mutateApi.mockResolvedValue({ id: "exam-2" });
    render(<ExamForm />);
    await user.type(screen.getByLabelText("Total de questões"), "100");
    expect(screen.queryByLabelText("Acertos", { exact: true })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar simulado" }));
    expect(mocks.mutateApi).toHaveBeenCalledWith("/api/mock-exams", "POST", expect.objectContaining({
      isHistorical: false, correctAnswers: null, wrongAnswers: null, startedAt: null, endedAt: null,
    }));
  });
});
