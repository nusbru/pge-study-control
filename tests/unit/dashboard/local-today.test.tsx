import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalTodayRedirect } from "@/modules/dashboard/local-today-redirect";

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

const originalTimezone = process.env.TZ;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  process.env.TZ = originalTimezone;
  vi.restoreAllMocks();
  mocks.replace.mockReset();
});

describe("LocalTodayRedirect", () => {
  it("hydrates safely before replacing a missing date with the browser's local date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T00:30:00.000Z"));
    process.env.TZ = "UTC";
    const serverHtml = renderToString(<LocalTodayRedirect period="30d" today={undefined} />);
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.append(container);
    expect(container).toHaveTextContent("Preparando seu desempenho...");

    process.env.TZ = "America/Los_Angeles";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let root!: Root;
    await act(async () => {
      root = hydrateRoot(container, <LocalTodayRedirect period="30d" today={undefined} />);
    });

    expect(mocks.replace).toHaveBeenCalledWith(
      "/dashboard?period=30d&today=2026-08-23",
      { scroll: false },
    );
    expect(consoleError.mock.calls.flat().join(" ").toLowerCase()).not.toContain("hydrat");

    await act(async () => root.unmount());
    container.remove();
  });

  it.each([
    ["invalid", null, true],
    ["stale", "2026-08-22", false],
    ["future", "2026-08-24", false],
  ])("replaces a %s query date without rendering stale data readiness", (_case, today, preparing) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T00:30:00.000Z"));
    process.env.TZ = "America/Los_Angeles";

    render(<LocalTodayRedirect period="7d" today={today} />);

    expect(mocks.replace).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith(
      "/dashboard?period=7d&today=2026-08-23",
      { scroll: false },
    );
    expect(screen.queryByText("Preparando seu desempenho...") !== null).toBe(preparing);
  });

  it("does not replace or render when the query already matches local today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T00:30:00.000Z"));
    process.env.TZ = "America/Los_Angeles";

    render(<LocalTodayRedirect period="30d" today="2026-08-23" />);

    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.queryByText("Preparando seu desempenho...")).not.toBeInTheDocument();
  });
});
