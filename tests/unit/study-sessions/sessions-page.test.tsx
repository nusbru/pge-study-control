import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SessionsPage from "@/app/(protected)/sessions/page";
import { constitutionalism, subjects } from "../../subjects";

const mocks = vi.hoisted(() => ({ listSessions: vi.fn(async () => ({ records: [], totalPages: 0 })) }));
vi.mock("@/lib/auth-user", () => ({ requireUserId: async () => "user-1" }));
vi.mock("@/modules/study-sessions/repository", () => ({
  listSessions: mocks.listSessions,
  listSubjects: async () => subjects,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/modules/study-sessions/actions", () => ({ deleteSessionAction: vi.fn() }));
afterEach(() => { cleanup(); mocks.listSessions.mockClear(); });

describe("SessionsPage", () => {
  it("passes the subject and page to the repository and renders a recoverable empty state", async () => {
    render(await SessionsPage({ searchParams: Promise.resolve({ page: "2", subjectId: constitutionalism.id }) }));
    expect(mocks.listSessions).toHaveBeenCalledWith(2, constitutionalism.id);
    expect(screen.getByLabelText("Assunto")).toHaveValue(constitutionalism.id);
    expect(screen.getByRole("link", { name: "Ver todos os assuntos" })).toHaveAttribute("href", "/sessions");
  });

  it("ignores malformed subject and page parameters", async () => {
    render(await SessionsPage({ searchParams: Promise.resolve({ page: "invalid", subjectId: "invalid" }) }));
    expect(mocks.listSessions).toHaveBeenCalledWith(1, undefined);
    expect(screen.getByLabelText("Assunto")).toHaveValue("");
  });
});
