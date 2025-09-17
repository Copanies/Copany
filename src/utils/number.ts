export function formatAbbreviatedCount(value: number): string {
  if (value < 1000) return String(value);
  const units = ["k", "M", "B", "T"] as const;
  let v = value;
  let i = -1;
  while (v >= 1000 && i < units.length - 1) {
    v = v / 1000;
    i++;
  }
  const fixed = v.toFixed(1);
  const trimmed = fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
  return `${trimmed}${units[i]}`;
};