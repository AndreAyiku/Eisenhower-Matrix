export const ESTIMATE_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120, 180];

export function formatEstimate(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function estimateOptions(current?: number): number[] {
  const set = new Set(ESTIMATE_OPTIONS);
  if (current) set.add(current);
  return [...set].sort((a, b) => a - b);
}