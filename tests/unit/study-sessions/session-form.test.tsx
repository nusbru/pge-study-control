import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionForm } from "@/modules/study-sessions/session-form";
import type { SessionActionState } from "@/modules/study-sessions/actions";
import { constitutionalism, constituentPower, environmentalLaw, subjects } from "../../subjects";

afterEach(cleanup);

function renderForm(
  action = vi.fn(async (): Promise<SessionActionState> => ({})),
) {
  return {
    action,
    ...render(<SessionForm action={action} subjects={subjects} defaultStudyDate="2026-08-23" />),
  };
}

describe("SessionForm", () => {
  it("requires a catalog selection and submits its GUID rather than its label", async () => {
    const user = userEvent.setup();
    const { action } = renderForm();
    const select = screen.getByRole("combobox", { name: "Assunto" });
    expect(select).toBeRequired();
    expect(select).toHaveValue("");
    expect(screen.getAllByRole("option")).toHaveLength(subjects.length + 1);
    await user.selectOptions(select, constitutionalism.id);
    await user.click(screen.getByRole("button", { name: "Salvar sessão" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    const submitted = (action.mock.calls[0] as unknown as [SessionActionState, FormData])[1];
    expect(submitted.get("subjectId")).toBe(constitutionalism.id);
    expect(submitted.has("subject")).toBe(false);
  });

  it("preselects the persisted subject when editing", () => {
    render(<SessionForm action={vi.fn()} subjects={subjects} defaultStudyDate="2026-08-23"
      defaultValues={{ subjectId: constituentPower.id }} />);
    expect(screen.getByRole("combobox", { name: "Assunto" })).toHaveValue(constituentPower.id);
    expect(screen.getByRole("option", { name: constituentPower.subject })).toHaveProperty("selected", true);
    expect(screen.getByRole("combobox", { name: "Assunto" })).toHaveStyle({ color: "#3f4b7b" });
    expect(screen.getByRole("combobox", { name: "Assunto" })).not.toHaveAccessibleDescription();
  });

  it("colors the subject field by prefix without adding a group label", async () => {
    const user = userEvent.setup();
    renderForm();
    const select = screen.getByRole("combobox", { name: "Assunto" });
    expect(screen.queryByText(/^Grupo /)).not.toBeInTheDocument();
    expect(select.style.color).toBe("");

    await user.selectOptions(select, constitutionalism.id);
    const color = select.style.color;
    expect(color).not.toBe("");
    await user.selectOptions(select, constituentPower.id);
    expect(select.style.color).toBe(color);

    await user.selectOptions(select, environmentalLaw.id);
    expect(select.style.color).not.toBe(color);
    expect(screen.queryByText(/^Grupo /)).not.toBeInTheDocument();
    expect(select).not.toHaveAccessibleDescription();

    await user.selectOptions(select, "");
    expect(screen.queryByText(/^Grupo /)).not.toBeInTheDocument();
    expect(select.style.color).toBe("");
    expect(select.style.backgroundColor).toBe("");
    expect(select).not.toHaveAccessibleDescription();
  });

  it("explains an empty catalog and prevents saving", () => {
    render(<SessionForm action={vi.fn()} subjects={[]} defaultStudyDate="2026-08-23" />);
    expect(screen.getByRole("combobox", { name: "Assunto" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Assunto" })).toHaveAccessibleDescription(/Nenhum assunto disponível/);
    expect(screen.getByRole("button", { name: "Salvar sessão" })).toBeDisabled();
  });

  it("renders every editable question type with no initial selection", () => {
    renderForm();

    expect(screen.getByRole("radio", { name: "Jurisprudência" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Lei Seca" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Doutrina" })).not.toBeChecked();
  });

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

    await user.selectOptions(screen.getByLabelText("Assunto"), constitutionalism.id);
    await user.click(screen.getByRole("button", { name: "Salvar sessão" }));

    expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
    finish({});
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar sessão" })).toBeEnabled());
  });

  it("restores values returned by the server after a failed submission", async () => {
    const action = vi.fn(async (): Promise<SessionActionState> => ({
      formError: "Revise os dados informados.",
      fieldErrors: { questionType: ["Selecione o tipo de questão."], subjectId: ["Selecione um assunto cadastrado."] },
      values: {
        studyDate: "2026-08-20",
        subjectId: constituentPower.id,
        questionType: "DOCTRINE",
        totalQuestions: "80",
        correctAnswers: "50",
        wrongAnswers: "30",
        questionListUrl: "https://example.com/lista",
        wrongQuestionListUrl: "https://example.com/erros",
      },
    }));
    const user = userEvent.setup();
    renderForm(action);

    await user.selectOptions(screen.getByLabelText("Assunto"), constitutionalism.id);
    await user.click(screen.getByRole("radio", { name: "Jurisprudência" }));
    await user.click(screen.getByRole("button", { name: "Salvar sessão" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Revise os dados informados.");
    expect(screen.getByRole("radio", { name: "Doutrina" })).toBeChecked();
    expect(screen.getByRole("group", { name: "Tipo de questão" })).toHaveAccessibleDescription(
      "Selecione o tipo de questão.",
    );
    expect(screen.getByLabelText("Data do estudo")).toHaveValue("2026-08-20");
    expect(screen.getByLabelText("Assunto")).toHaveValue(constituentPower.id);
    expect(screen.getByLabelText("Assunto")).toHaveAccessibleDescription("Selecione um assunto cadastrado.");
    expect(screen.getByLabelText("Assunto")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Total de questões")).toHaveValue(80);
    expect(screen.getByLabelText("Acertos")).toHaveValue(50);
    expect(screen.getByLabelText("Erros")).toHaveValue(30);
    expect(screen.getByLabelText("Link da lista de questões")).toHaveValue("https://example.com/lista");
    expect(screen.getByLabelText("Link da lista de erros")).toHaveValue("https://example.com/erros");
  });
});
