export const feelingLabels = {
  CONFIDENT: "Confiante", CALM: "Tranquilo", ANXIOUS: "Ansioso", TIRED: "Cansado", FRUSTRATED: "Frustrado",
} as const;

export function statusLabel(status: string) {
  return status === "RUNNING" ? "Em andamento" : status === "COMPLETED" ? "Finalizado" : "Não iniciado";
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return "Tempo não informado";
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 3600)).padStart(2, "0")}:${String(Math.floor(value / 60) % 60).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function formatExamDate(value: string) {
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

export function localDateTime(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}T${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}:${String(value.getSeconds()).padStart(2, "0")}`;
}
