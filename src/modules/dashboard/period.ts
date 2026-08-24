export type DashboardPeriod = "7d" | "30d" | "90d" | "all";

const periods = new Set<DashboardPeriod>(["7d", "30d", "90d", "all"]);
const periodDays: Record<Exclude<DashboardPeriod, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function parseDashboardPeriod(value: unknown): DashboardPeriod {
  return typeof value === "string" && periods.has(value as DashboardPeriod)
    ? value as DashboardPeriod
    : "30d";
}

export function parseDashboardToday(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, rawYear, rawMonth, rawDay] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  if (year === 0) return null;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? value
    : null;
}

export function getPeriodStart(period: DashboardPeriod, today: string): string | null {
  if (period === "all") return null;
  const validToday = parseDashboardToday(today);
  if (!validToday) throw new Error("Data de referência inválida.");

  const [year, month, day] = validToday.split("-").map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day - (periodDays[period] - 1));

  const startDate = [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
  if (!parseDashboardToday(startDate)) {
    throw new Error("O período ultrapassa o limite mínimo de data.");
  }
  return startDate;
}
