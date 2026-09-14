export type DashboardTab = "sessoes" | "simulados";

export function parseDashboardTab(value: string | string[] | undefined): DashboardTab {
  return value === "simulados" ? "simulados" : "sessoes";
}
