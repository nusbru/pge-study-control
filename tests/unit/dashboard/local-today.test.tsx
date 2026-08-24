import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalTodayRedirect } from "@/modules/dashboard/local-today-redirect";

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

const originalTimezone = process.env.TZ;

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = originalTimezone;
  vi.restoreAllMocks();
  mocks.replace.mockReset();
});

describe("LocalTodayRedirect", () => {
  it("hydrates safely before requesting the browser's local calendar date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T00:30:00.000Z"));
    process.env.TZ = "UTC";
    const serverHtml = renderToString(<LocalTodayRedirect period="30d" />);
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.append(container);
    expect(container).toHaveTextContent("Preparando seu desempenho...");

    process.env.TZ = "America/Los_Angeles";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let root!: Root;
    await act(async () => {
      root = hydrateRoot(container, <LocalTodayRedirect period="30d" />);
    });

    expect(mocks.replace).toHaveBeenCalledWith(
      "/dashboard?period=30d&today=2026-08-23",
      { scroll: false },
    );
    expect(consoleError.mock.calls.flat().join(" ").toLowerCase()).not.toContain("hydrat");

    await act(async () => root.unmount());
    container.remove();
  });
});
