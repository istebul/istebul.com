/**
 * İSTEBUL Business Import Engine — SemanticMappingRuntime (PR-101G).
 *
 * Schema Detection kolon adaylarını Business Field’lara eşler.
 * Veri dönüştürme / BusinessDataset / AI yoktur.
 */

import type { SemanticColumnMapping } from '../../ports/ISemanticMapper';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../pipeline/runtime/timing';
import type { SemanticCandidate } from './SemanticCandidate';
import type { SemanticContext } from './SemanticContext';
import {
  confidenceBand,
  normalizeSemanticKey,
  roundConfidence
} from './helpers';
import {
  createSemanticRegistryRuntime,
  SemanticRegistryRuntime
} from './SemanticRegistryRuntime';
import type {
  SemanticColumnResult,
  SemanticConfidenceDistribution,
  SemanticMappingTelemetry,
  SemanticResult
} from './SemanticResult';
import { toFoundationSemanticMappingResult } from './SemanticResult';

function emptyDistribution(): SemanticConfidenceDistribution {
  return { high: 0, medium: 0, low: 0 };
}

function dedupeCandidates(
  candidates: readonly SemanticCandidate[]
): SemanticCandidate[] {
  const best = new Map<string, SemanticCandidate>();
  for (const c of candidates) {
    const key = `${c.businessField}::${c.entityType}`;
    const prev = best.get(key);
    if (!prev || c.confidence > prev.confidence) {
      best.set(key, c);
    }
  }
  return [...best.values()].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Semantic Mapping Runtime orchestrator.
 */
export class SemanticMappingRuntime {
  private readonly registry: SemanticRegistryRuntime;

  constructor(registry?: SemanticRegistryRuntime) {
    this.registry = registry ?? createSemanticRegistryRuntime(true);
  }

  getRegistry(): SemanticRegistryRuntime {
    return this.registry;
  }

  /**
   * Kolon adaylarını business field’lara eşler — dönüştürmez.
   */
  map(context: SemanticContext): SemanticResult {
    const timer = startStageTimer();
    const startMark = nowMs();
    const rules = this.registry.getAll();
    const minConfidence = context.minConfidence ?? 0.35;
    const maxAlternatives = context.maxAlternatives ?? 3;

    let rulesExecuted = 0;
    let rulesMatched = 0;
    const columns: SemanticColumnResult[] = [];
    const mappings: SemanticColumnMapping[] = [];
    const unmapped: string[] = [];
    const distribution = emptyDistribution();

    for (const sourceKey of context.columnKeys) {
      const normalizedKey = normalizeSemanticKey(sourceKey);
      const raw: SemanticCandidate[] = [];

      for (const rule of rules) {
        rulesExecuted += 1;
        let produced: readonly SemanticCandidate[] = [];
        try {
          produced = rule.match(sourceKey, normalizedKey, context) ?? [];
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Kural yürütme hatası';
          produced = [
            {
              sourceKey,
              businessField: '_error',
              entityType: 'dokuman',
              confidence: 0,
              reason: `Kural hatası: ${message}`,
              ruleId: rule.id
            }
          ];
        }
        if (produced.length > 0) {
          rulesMatched += 1;
          raw.push(...produced.filter((c) => c.businessField !== '_error'));
        }
      }

      const ranked = dedupeCandidates(raw).filter(
        (c) => c.confidence >= minConfidence
      );
      const withRank = ranked.map((c, index) => ({
        ...c,
        confidence: roundConfidence(c.confidence),
        rank: index + 1
      }));

      const primary = withRank[0];
      const alternatives = Object.freeze(withRank.slice(1, 1 + maxAlternatives));

      if (!primary) {
        unmapped.push(sourceKey);
        columns.push({
          sourceKey,
          alternatives: Object.freeze([]),
          candidates: Object.freeze([])
        });
        continue;
      }

      distribution[confidenceBand(primary.confidence)] += 1;
      mappings.push({
        sourceKey,
        entityType: primary.entityType,
        targetColumnId: primary.businessField,
        confidence: primary.confidence
      });

      columns.push({
        sourceKey,
        businessField: primary.businessField,
        entityType: primary.entityType,
        confidence: primary.confidence,
        reason: primary.reason,
        primary,
        alternatives,
        candidates: Object.freeze(withRank)
      });
    }

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: SemanticMappingTelemetry = {
      ruleCount: rules.length,
      rulesExecuted,
      rulesMatched,
      totalMatches: mappings.length,
      unmappedCount: unmapped.length,
      confidenceDistribution: distribution,
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt
    };

    return {
      columns: Object.freeze(columns),
      mappings: Object.freeze(mappings),
      unmappedSourceKeys: Object.freeze(unmapped),
      telemetry
    };
  }

  toFoundationResult(result: SemanticResult) {
    return toFoundationSemanticMappingResult(result);
  }
}

export function createSemanticMappingRuntime(
  registry?: SemanticRegistryRuntime
): SemanticMappingRuntime {
  return new SemanticMappingRuntime(registry);
}

export default SemanticMappingRuntime;
