import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubjectFilter } from "@/modules/subjects/subject-filter";
import { parseSubjectFilter } from "@/modules/subjects/filter";
import { constitutionalism, subjects } from "../../subjects";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
afterEach(() => { cleanup(); mocks.push.mockReset(); });

describe("SubjectFilter", () => {
  it("changes the subject while preserving period and question type", async () => {
    render(<SubjectFilter subjects={subjects} pathname="/dashboard"
      query={{ period: "7d", today: "2026-09-09", questionType: "doctrine" }} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Assunto" }), constitutionalism.id);
    expect(mocks.push).toHaveBeenCalledWith(
      `/dashboard?period=7d&today=2026-09-09&questionType=doctrine&subjectId=${constitutionalism.id}`, { scroll: false },
    );
  });

  it("clears only the subject and resets pagination", async () => {
    render(<SubjectFilter subjects={subjects} pathname="/sessions" subjectId={constitutionalism.id}
      query={{ page: "3", subjectId: constitutionalism.id }} />);
    await userEvent.selectOptions(screen.getByLabelText("Assunto"), "");
    expect(mocks.push).toHaveBeenCalledWith("/sessions", { scroll: false });
  });

  it("resets pagination when choosing a subject", async () => {
    render(<SubjectFilter subjects={subjects} pathname="/sessions" query={{ page: "3" }} />);
    await userEvent.selectOptions(screen.getByLabelText("Assunto"), constitutionalism.id);
    expect(mocks.push).toHaveBeenCalledWith(`/sessions?subjectId=${constitutionalism.id}`, { scroll: false });
  });

  it("keeps an unknown subject visible and allows clearing it", async () => {
    render(<SubjectFilter subjects={subjects} pathname="/sessions" subjectId="00000000-0000-0000-0000-000000000001" />);
    expect(screen.getByRole("option", { name: "Assunto indisponível" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Assunto"), "");
    expect(mocks.push).toHaveBeenCalledWith("/sessions", { scroll: false });
  });
});

describe("parseSubjectFilter", () => {
  it.each([undefined, "", "all", "invalid", [constitutionalism.id]])("ignores an invalid query value %j", (value) => {
    expect(parseSubjectFilter(value)).toBeUndefined();
  });

  it("normalizes UUID casing to match the catalog", () => {
    expect(parseSubjectFilter(constitutionalism.id.toUpperCase())).toBe(constitutionalism.id);
  });
});
