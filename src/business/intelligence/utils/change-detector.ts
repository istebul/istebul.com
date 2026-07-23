/**
 * Detect meaningful numeric change between two values.
 * Absolute and relative thresholds keep noise out of Event Intelligence.
 */
export function detectChange(
  previous: number,
  current: number,
  options: { absoluteThreshold?: number; relativeThreshold?: number } = {}
): boolean {
  const absoluteThreshold = options.absoluteThreshold ?? 0.5;
  const relativeThreshold = options.relativeThreshold ?? 0.02;
  const absDelta = Math.abs(current - previous);
  if (absDelta < absoluteThreshold) return false;
  const baseline = Math.abs(previous);
  if (baseline === 0) return absDelta >= absoluteThreshold;
  return absDelta / baseline >= relativeThreshold;
}

/**
 * Detect change against a previous map of KPI numeric values.
 */
export function detectKpiChanges(
  previous: Readonly<Record<string, number>>,
  current: Readonly<Record<string, number>>,
  options?: { absoluteThreshold?: number; relativeThreshold?: number }
): readonly string[] {
  const changed: string[] = [];
  for (const [id, value] of Object.entries(current)) {
    const prev = previous[id];
    if (typeof prev !== 'number') {
      changed.push(id);
      continue;
    }
    if (detectChange(prev, value, options)) changed.push(id);
  }
  return Object.freeze(changed);
}

export default detectChange;
