import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DetailedSearch } from "@/modules/dashboard/detailed-search";
import { parseSubjectGroupFilter } from "@/modules/subjects/filter";
import { constitutionalism, constituentPower, environmentalLaw, subjects } from "../../subjects";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks }));
const query = { period: "7d", today: "2026-09-09", questionType: "doctrine" };

afterEach(() => { cleanup(); mocks.push.mockReset(); });

describe("detailed search", () => {
  it("starts collapsed without filters and opens on demand", async () => {
    const user = userEvent.setup();
    render(<DetailedSearch subjects={subjects} query={query} />);
    const summary = screen.getByText("Busca detalhada");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    await user.click(summary);
    expect(screen.getByRole("combobox", { name: "Grupo de assunto" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Assunto" })).toBeVisible();
  });

  it("opens for active filters and lists only subjects from the selected group", () => {
    render(<DetailedSearch subjects={subjects} subjectGroup="10" query={query} />);
    expect(screen.getByText("Busca detalhada").closest("details")).toHaveAttribute("open");
    expect(screen.getByText("1 filtro ativo")).toBeVisible();
    const select = screen.getByRole("combobox", { name: "Assunto" });
    expect(within(select).getByRole("option", { name: constitutionalism.subject })).toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: environmentalLaw.subject })).not.toBeInTheDocument();
    const groups = screen.getByRole("combobox", { name: "Grupo de assunto" });
    expect(within(groups).getAllByRole("option").map(option => option.textContent))
      .toEqual(["Todos os grupos", "Grupo 10", "Grupo 70"]);
  });

  it.each([["70", false], ["10", true], ["", true]] as const)(
    "selecting group %s keeps the subject only when compatible", async (group, keepSubject) => {
      const user = userEvent.setup();
      render(<DetailedSearch subjects={subjects} subjectId={constitutionalism.id} query={query} />);
      await user.selectOptions(screen.getByRole("combobox", { name: "Grupo de assunto" }), group);
      const url = new URL(mocks.push.mock.calls[0][0], "https://example.com");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        ...query, ...(group ? { subjectGroup: group } : {}), ...(keepSubject ? { subjectId: constitutionalism.id } : {}),
      });
      expect(mocks.push.mock.calls[0][1]).toEqual({ scroll: false });
    },
  );

  it("preserves group, period and question type when selecting or clearing the subject", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DetailedSearch subjects={subjects} subjectGroup="10" query={query} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Assunto" }), constituentPower.id);
    expect(mocks.push).toHaveBeenLastCalledWith(
      `/dashboard?period=7d&today=2026-09-09&questionType=doctrine&subjectGroup=10&subjectId=${constituentPower.id}`, { scroll: false },
    );
    rerender(<DetailedSearch subjects={subjects} subjectGroup="10" subjectId={constituentPower.id} query={query} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Assunto" }), "");
    expect(mocks.push).toHaveBeenLastCalledWith(
      "/dashboard?period=7d&today=2026-09-09&questionType=doctrine&subjectGroup=10", { scroll: false },
    );
    await user.click(screen.getByText("Busca detalhada"));
    expect(screen.getByText("Busca detalhada").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByText("2 filtros ativos")).toBeVisible();
  });

  it.each([undefined, ["10", "70"], "1", "100", "ab", " 10", "١٠"])("ignores invalid group %j", value => {
    expect(parseSubjectGroupFilter(value)).toBeUndefined();
  });

  it("preserves leading zeros", () => {
    expect(parseSubjectGroupFilter("01")).toBe("01");
  });
});
