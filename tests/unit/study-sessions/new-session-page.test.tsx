import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import NewSessionPage from "@/app/(protected)/sessions/new/page";
import { SessionForm } from "@/modules/study-sessions/session-form";
import type { SessionActionState } from "@/modules/study-sessions/actions";

const mocks = vi.hoisted(() => ({
  createSessionAction: vi.fn(async (): Promise<SessionActionState> => ({})),
}));

vi.mock("@/modules/study-sessions/actions", () => ({
  createSessionAction: mocks.createSessionAction,
}));

const originalTimezone = process.env.TZ;

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = originalTimezone;
  vi.restoreAllMocks();
});

describe("new-session local date", () => {
  it("hydrates without mismatch and defaults to the browser calendar date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T00:30:00.000Z"));
    process.env.TZ = "UTC";
    const serverHtml = renderToString(<NewSessionPage />);
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.append(container);
    const serverDateInput = container.querySelector<HTMLInputElement>('input[name="studyDate"]');
    const serverSubmit = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(serverDateInput).toHaveAttribute("value", "");
    expect(serverSubmit).toBeDisabled();
    expect(serverSubmit).toHaveTextContent("Preparando data...");

    process.env.TZ = "America/Los_Angeles";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let root!: Root;
    await act(async () => {
      root = hydrateRoot(container, <NewSessionPage />);
    });

    const dateInput = container.querySelector<HTMLInputElement>('input[name="studyDate"]');
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(dateInput).toHaveValue("2026-08-23");
    expect(submit).toBeEnabled();
    expect(submit).toHaveTextContent("Salvar sessão");
    expect(consoleError.mock.calls.flat().join(" ").toLowerCase()).not.toContain("hydrat");

    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps a persisted edit date across hydration at the same timezone boundary", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T00:30:00.000Z"));
    process.env.TZ = "America/Los_Angeles";

    const renderEditForm = () => (
      <SessionForm
        action={mocks.createSessionAction}
        defaultStudyDate="2026-08-24"
        defaultValues={{ studyDate: "2026-08-24" }}
      />
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(renderEditForm());
    document.body.append(container);
    const serverSubmit = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(serverSubmit).toBeEnabled();
    expect(serverSubmit).toHaveTextContent("Salvar sessão");

    let root!: Root;
    await act(async () => {
      root = hydrateRoot(container, renderEditForm());
    });

    expect(container.querySelector('input[name="studyDate"]')).toHaveValue("2026-08-24");
    expect(container.querySelector('button[type="submit"]')).toBeEnabled();

    await act(async () => root.unmount());
    container.remove();
  });
});
