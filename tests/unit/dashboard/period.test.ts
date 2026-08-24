import { describe, expect, it } from "vitest";
import {
  getPeriodStart,
  parseDashboardPeriod,
  parseDashboardToday,
  type DashboardPeriod,
} from "@/modules/dashboard/period";

describe("dashboard period", () => {
  it.each([
    ["7d", "2026-08-17"],
    ["30d", "2026-07-25"],
    ["90d", "2026-05-26"],
    ["all", null],
  ])("returns the inclusive start for %s", (period, expected) => {
    expect(getPeriodStart(period as DashboardPeriod, "2026-08-23")).toBe(expected);
  });

  it.each([
    ["7d", "2024-03-01", "2024-02-24"],
    ["30d", "2026-03-01", "2026-01-31"],
    ["90d", "2026-01-15", "2025-10-18"],
  ])("crosses calendar boundaries without shifting %s", (period, today, expected) => {
    expect(getPeriodStart(period as DashboardPeriod, today)).toBe(expected);
  });

  it.each([
    ["7d", "0001-01-07"],
    ["30d", "0001-01-30"],
    ["90d", "0001-03-31"],
  ])("accepts the earliest PostgreSQL-safe %s window", (period, today) => {
    expect(getPeriodStart(period as DashboardPeriod, today)).toBe("0001-01-01");
  });

  it.each([
    ["7d", "0001-01-06"],
    ["30d", "0001-01-29"],
    ["90d", "0001-03-30"],
  ])("rejects a %s window crossing PostgreSQL year zero", (period, today) => {
    expect(() => getPeriodStart(period as DashboardPeriod, today)).toThrow(
      "O período ultrapassa o limite mínimo de data.",
    );
  });

  it.each([
    ["7d", "7d"],
    ["30d", "30d"],
    ["90d", "90d"],
    ["all", "all"],
    [undefined, "30d"],
    ["invalid", "30d"],
    [["7d"], "30d"],
  ])("parses period query value %j as %s", (value, expected) => {
    expect(parseDashboardPeriod(value)).toBe(expected);
  });

  it.each([
    ["2026-08-23", "2026-08-23"],
    ["2024-02-29", "2024-02-29"],
    [undefined, null],
    ["0000-01-01", null],
    ["2026-02-29", null],
    ["2026-08-32", null],
    ["23-08-2026", null],
    [["2026-08-23"], null],
  ])("validates civil date query value %j", (value, expected) => {
    expect(parseDashboardToday(value)).toBe(expected);
  });
});
