/**
 * Outcome-informed lead scoring calibration (P3 moat).
 * Deterministic — never LLM-driven.
 */

export type SegmentBenchmark = {
  segment_key: string;
  sample_size: number;
  win_count?: number;
  win_rate_pct?: number | null;
  avg_lead_score?: number | null;
  avg_match_score?: number | null;
};

const WIN_STATUSES = new Set([
  "paid",
  "closed",
  "won",
  "delivered",
  "funded",
  "purchased",
]);

export function buildSegmentKey(form: Record<string, unknown>): string {
  const budget = Number(form.budget || 0);
  const budgetBand =
    budget >= 2000000
      ? "2m+"
      : budget >= 1000000
        ? "1m-2m"
        : budget >= 500000
          ? "500k-1m"
          : "sub500k";

  const body = String(form.body || "any").toLowerCase().slice(0, 24) || "any";
  const fuel = String(form.fuel || "any").toLowerCase().slice(0, 16) || "any";
  const interest = String(form.interest_type || "vehicle_offer")
    .toLowerCase()
    .slice(0, 32);

  return `${interest}|${budgetBand}|${body}|${fuel}`;
}

export function aggregateSegmentBenchmarks(
  leads: Array<Record<string, unknown>>
): SegmentBenchmark[] {
  const buckets = new Map<string, { total: number; wins: number; scoreSum: number; matchSum: number }>();

  for (const lead of leads) {
    const key = String(lead.segment_key || "");
    if (!key) continue;

    const bucket = buckets.get(key) || { total: 0, wins: 0, scoreSum: 0, matchSum: 0 };
    bucket.total += 1;
    if (WIN_STATUSES.has(String(lead.partner_status || ""))) bucket.wins += 1;
    bucket.scoreSum += Number(lead.lead_score || 0);
    bucket.matchSum += Number(lead.top_match_score || 0);
    buckets.set(key, bucket);
  }

  const rows: SegmentBenchmark[] = [];
  for (const [segment_key, bucket] of buckets) {
    if (bucket.total < 3) continue;
    rows.push({
      segment_key,
      sample_size: bucket.total,
      win_count: bucket.wins,
      win_rate_pct: Math.round((bucket.wins / bucket.total) * 1000) / 10,
      avg_lead_score: Math.round((bucket.scoreSum / bucket.total) * 10) / 10,
      avg_match_score: Math.round((bucket.matchSum / bucket.total) * 10) / 10,
    });
  }

  return rows.sort((a, b) => b.sample_size - a.sample_size);
}

export function calibrateLeadScore(
  baseScore: number,
  benchmark: Pick<SegmentBenchmark, "sample_size" | "win_rate_pct"> | null | undefined
): { score: number; delta: number; reason: string } {
  const base = Math.max(0, Math.min(200, Math.round(baseScore)));

  if (!benchmark || benchmark.sample_size < 5 || benchmark.win_rate_pct == null) {
    return { score: base, delta: 0, reason: "insufficient_outcome_data" };
  }

  let delta = 0;
  const winRate = Number(benchmark.win_rate_pct);

  if (winRate >= 25) delta += 8;
  else if (winRate >= 15) delta += 4;
  else if (winRate < 8) delta -= 6;

  const score = Math.max(0, Math.min(200, base + delta));
  return { score, delta, reason: "outcome_calibrated" };
}

export function priorityFromScore(score: number): string {
  const s = Math.round(Number(score || 0));
  if (s >= 150) return "very_hot";
  if (s >= 100) return "hot";
  if (s >= 50) return "warm";
  return "cold";
}

export function leadMeetsPartnerScoreFloor(
  leadScore: number,
  minLeadScore: number | null | undefined
): boolean {
  const min = Number(minLeadScore || 0);
  if (!min || min <= 0) return true;
  return Number(leadScore || 0) >= min;
}
