export function parseSubjectFilter(value: unknown): string | undefined {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase()
    : undefined;
}

export function parseSubjectGroupFilter(value: unknown): string | undefined {
  return typeof value === "string" && /^[0-9]{2}$/.test(value) ? value : undefined;
}
