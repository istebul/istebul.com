import type { DomainScore, ExecutiveKpi, HealthBand } from '../models/business-health';
import { scoreToBand } from '../utils/score-normalizer';

/**
 * Builds executive KPI objects from domain scores + overall health.
 * Intended for Dashboard / Advisor data contracts (UI markup unchanged).
 */
export function buildExecutiveKpis(
  domainScores: readonly DomainScore[],
  overallScore: number,
  overallBand: HealthBand
): readonly ExecutiveKpi[] {
  const overall: ExecutiveKpi = Object.freeze({
    id: 'business-health',
    label: 'Business Health',
    value: String(overallScore),
    score: overallScore,
    band: overallBand,
    unit: 'score' as const
  });

  const domainKpis = domainScores.map((domain) =>
    Object.freeze({
      id: `exec-${domain.id}`,
      label: domain.label,
      value: String(domain.score),
      score: domain.score,
      band: domain.band,
      unit: 'score' as const
    })
  );

  return Object.freeze([overall, ...domainKpis]);
}

export function resolveHealthLabel(score: number, band: HealthBand): string {
  void band;
  if (score >= 75) return 'Güçlü iş sağlığı';
  if (score >= 55) return 'Stabil iş sağlığı';
  if (score >= 40) return 'İzleme gerektiren iş sağlığı';
  return 'Kritik iş sağlığı';
}

export function bandFromOverall(score: number): HealthBand {
  return scoreToBand(score);
}

export default buildExecutiveKpis;
