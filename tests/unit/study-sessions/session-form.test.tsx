import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionForm } from "@/modules/study-sessions/session-form";
import type { SessionActionState } from "@/modules/study-sessions/actions";

afterEach(cleanup);

function renderForm(
  action = vi.fn(async (): Promise<SessionActionState> => ({})),
) {
  return {
    action,
    ...render(<SessionForm action={action} defaultStudyDate="2026-08-23" />),
  };
}

describe("SessionForm", () => {
  it("calculates errors from total and correct answers", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Total de questões"), "50");
    await user.type(screen.getByLabelText("Acertos"), "30");

    expect(screen.getByLabelText("Erros")).toHaveValue(20);
    expect(screen.getByText("Calculado automaticamente")).toBeVisible();
    expect(screen.getByText("60,0% de acertos")).toBeVisible();
    expect(screen.getByText("40,0% de erros")).toBeVisible();
  });

  it("formats fractional percentages with one decimal in Brazilian Portuguese", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Total de questões"), "3");
    await user.type(screen.getByLabelText("Acertos"), "2");

    expect(screen.getByText("66,7% de acertos")).toBeVisible();
    expect(screen.getByText("33,3% de erros")).toBeVisible();
  });

  it("calculates correct answers from total and errors", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Total de questões"), "50");
    await user.type(screen.getByLabelText("Erros"), "20");

    expect(screen.getByLabelText("Acertos")).toHaveValue(30);
    expect(screen.getByText("Calculado automaticamente")).toBeVisible();
  });

  it("calculates total from correct answers and errors", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Acertos"), "30");
    await user.type(screen.getByLabelText("Erros"), "20");

    expect(screen.getByLabelText("Total de questões")).toHaveValue(50);
    expect(screen.getByText("Calculado automaticamente")).toBeVisible();
  });

  it("changes the calculation basis when a source field is cleared", async () => {
    const user = userEvent.setup();
    renderForm();

    const total = screen.getByLabelText("Total de questões");
    const errors = screen.getByLabelText("Erros");
    await user.type(total, "50");
    await user.type(screen.getByLabelText("Acertos"), "30");
    expect(errors).toHaveValue(20);
    expect(errors).toHaveAccessibleDescription("Calculado automaticamente");

    await user.clear(total);

    expect(total).toHaveValue(50);
    expect(total).toHaveAccessibleDescription("Calculado automaticamente");
    expect(errors).not.toHaveAccessibleDescription("Calculado automaticamente");
  });

  it("keeps an inconsistent manual value and explains the conflict", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Total de questões"), "50");
    await user.type(screen.getByLabelText("Acertos"), "30");
    const errors = screen.getByLabelText("Erros");
    await user.clear(errors);
    await user.type(errors, "25");

    expect(errors).toHaveValue(25);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "O total deve ser igual à soma de acertos e erros.",
    );
    expect(screen.queryByText("Calculado automaticamente")).not.toBeInTheDocument();
  });

  it("disables submission and announces progress while pending", async () => {
    let finish!: (state: SessionActionState) => void;
    const action = vi.fn(() => new Promise<SessionActionState>((resolve) => {
      finish = resolve;
    }));
    const user = userEvent.setup();
    renderForm(action);

    await user.type(screen.getByLabelText("Assunto"), "Direito Civil");
    await user.click(screen.getByRole("button", { name: "Salvar sessão" }));

    expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
    finish({});
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar sessão" })).toBeEnabled());
  });

  it("restores values returned by the server after a failed submission", async () => {
    const action = vi.fn(async (): Promise<SessionActionState> => ({
      formError: "Revise os dados informados.",
      values: {
        studyDate: "2026-08-20",
        subject: "Direito Tributário",
        totalQuestions: "80",
        correctAnswers: "50",
        wrongAnswers: "30",
        questionListUrl: "https://example.com/lista",
        wrongQuestionListUrl: "https://example.com/erros",
      },
    }));
    const user = userEvent.setup();
    renderForm(action);

    await user.type(screen.getByLabelText("Assunto"), "rascunho");
    await user.click(screen.getByRole("button", { name: "Salvar sessão" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Revise os dados informados.");
    expect(screen.getByLabelText("Data do estudo")).toHaveValue("2026-08-20");
    expect(screen.getByLabelText("Assunto")).toHaveValue("Direito Tributário");
    expect(screen.getByLabelText("Total de questões")).toHaveValue(80);
    expect(screen.getByLabelText("Acertos")).toHaveValue(50);
    expect(screen.getByLabelText("Erros")).toHaveValue(30);
    expect(screen.getByLabelText("Link da lista de questões")).toHaveValue("https://example.com/lista");
    expect(screen.getByLabelText("Link da lista de erros")).toHaveValue("https://example.com/erros");
  });
});
