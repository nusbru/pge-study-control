type GroupColors = {
  color: string;
  backgroundColor: string;
};

// Key colors by prefix, never by the position of an item in a filtered list.
const groupColors: Record<string, GroupColors> = {
  "10": { color: "#3f4b7b", backgroundColor: "#eef0f8" },
  "20": { color: "#6b3f83", backgroundColor: "#f5eef9" },
  "30": { color: "#17656a", backgroundColor: "#eaf6f5" },
  "40": { color: "#84501e", backgroundColor: "#fbf2e7" },
  "50": { color: "#8a3b62", backgroundColor: "#faedf3" },
  "60": { color: "#645b20", backgroundColor: "#f6f4e5" },
  "70": { color: "#2f664b", backgroundColor: "#edf6ef" },
};

const neutralColors: GroupColors = {
  color: "#515361",
  backgroundColor: "#f0f0f2",
};

export function getSubjectGroup(subject: string) {
  const code = /^\s*(\d{2})\d*(?=\s|[—–-]|$)/.exec(subject)?.[1] ?? null;
  if (code === null) return { code, ...neutralColors };

  // New prefixes also receive a stable color without changing existing groups.
  const hue = (Number(code) * 137.508) % 360;
  const colors = groupColors[code] ?? {
    color: `hsl(${hue} 60% 28%)`,
    backgroundColor: `hsl(${hue} 45% 96%)`,
  };

  return { code, ...colors };
}
