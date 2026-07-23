/**
 * İSTEBUL Business Analysis Engine — RuleEngineRuntime (PR-102C).
 *
 * KPI sonuçları üzerinde kural değerlendirir.
 * Karar vermez, öneri üretmez. Finding Builder değildir; yalnızca tetiklenen
 * kurallar için foundation `AnalysisFinding` projeksiyonu üretir.
 */

import type { BusinessDataset } from '../../../dataset/models/BusinessDataset';
import type { AnalysisContext } from '../../models/AnalysisContext';
import type { AnalysisFinding } from '../../models/AnalysisFinding';
import type { AnalysisFindingSeverity } from '../../models/AnalysisFinding';
import type { KPIResult as FoundationKPIResult } from '../../models/KPIResult';
import type { IRuleEngine } from '../../ports/IRuleEngine';
import {
  endAnalysisStageTimer,
  nowMs,
  startAnalysisStageTimer
} from '../../pipeline/runtime/AnalysisTiming';
import type { RuleContext } from './RuleContext';
import { createRuleContext } from './RuleContext';
import type { RuleDefinition, RuleSeverity } from './RuleDefinition';
import type { RuleEvaluation } from './RuleEvaluation';
import type { RuleRegistryRuntime } from './RuleRegistryRuntime';
import { createRuleRegistryRuntime } from './RuleRegistryRuntime';
import type {
  RuleResult,
  RuleTelemetry,
  RuleWarning
} from './RuleResult';

function mapSeverityToFinding(
  severity: RuleSeverity
): AnalysisFindingSeverity {
  if (severity === 'INFO') {
    return 'bilgi';
  }
  if (severity === 'WARNING') {
    return 'uyari';
  }
  return 'kritik';
}

function findKpiValue(
  kpiResults: readonly FoundationKPIResult[],
  kpiId: string
): FoundationKPIResult | undefined {
  return kpiResults.find((item) => item.kpiId === kpiId);
}

function toNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function compareNumeric(
  observed: number,
  operator: RuleDefinition['operator'],
  threshold: number
): boolean {
  switch (operator) {
    case 'gt':
      return observed > threshold;
    case 'gte':
      return observed >= threshold;
    case 'lt':
      return observed < threshold;
    case 'lte':
      return observed <= threshold;
    case 'eq':
      return observed === threshold;
    default:
      return false;
  }
}

function resolveObservedValue(
  definition: RuleDefinition,
  kpiResults: readonly FoundationKPIResult[]
): {
  value: string | number | null;
  skipReason?: string;
} {
  if (definition.id === 'null-value-ratio-threshold') {
    const nullCount = findKpiValue(kpiResults, 'null-value-count');
    const totalFields = findKpiValue(kpiResults, 'total-field-count');
    if (!nullCount || nullCount.unavailableReason) {
      return {
        value: null,
        skipReason: 'null-value-count KPI sonucu yok.'
      };
    }
    if (!totalFields || totalFields.unavailableReason) {
      return {
        value: null,
        skipReason: 'total-field-count KPI sonucu yok.'
      };
    }
    const nullNum = toNumber(nullCount.value);
    const totalNum = toNumber(totalFields.value);
    if (nullNum === null || totalNum === null) {
      return {
        value: null,
        skipReason: 'Null ratio için sayısal KPI değeri yok.'
      };
    }
    if (totalNum === 0) {
      return { value: 0 };
    }
    return {
      value: Math.round((nullNum / totalNum) * 10000) / 10000
    };
  }

  const kpiId = definition.kpiId;
  if (!kpiId) {
    return { value: null, skipReason: 'Kural için kpiId tanımlı değil.' };
  }

  const kpi = findKpiValue(kpiResults, kpiId);
  if (!kpi) {
    return { value: null, skipReason: `KPI sonucu yok: ${kpiId}` };
  }

  // present / not-empty: unavailable KPI → observed null (eksik metadata)
  if (
    definition.operator === 'present' ||
    definition.operator === 'not-empty'
  ) {
    return { value: kpi.unavailableReason ? null : kpi.value };
  }

  if (kpi.unavailableReason) {
    return {
      value: null,
      skipReason: `KPI hesaplanamadı: ${kpi.unavailableReason}`
    };
  }

  return { value: kpi.value };
}

function evaluateDefinition(
  definition: RuleDefinition,
  kpiResults: readonly FoundationKPIResult[]
): Omit<RuleEvaluation, 'durationMs'> {
  if (!definition.enabled) {
    return {
      definition,
      outcome: 'skipped',
      message: 'Kural pasif; değerlendirme atlandı.',
      skipReason: 'Rule disabled.',
      threshold: definition.threshold
    };
  }

  const resolved = resolveObservedValue(definition, kpiResults);
  if (resolved.skipReason) {
    return {
      definition,
      outcome: 'skipped',
      observedValue: resolved.value,
      threshold: definition.threshold,
      message: resolved.skipReason,
      skipReason: resolved.skipReason
    };
  }

  const observed = resolved.value;

  if (definition.operator === 'present') {
    const present =
      observed !== null &&
      observed !== undefined &&
      !(typeof observed === 'string' && observed.trim() === '');
    return {
      definition,
      outcome: present ? 'passed' : 'triggered',
      observedValue: observed,
      message: present
        ? 'Metadata değeri mevcut.'
        : 'Metadata değeri eksik.'
    };
  }

  if (definition.operator === 'not-empty') {
    const notEmpty =
      typeof observed === 'string'
        ? observed.trim().length > 0
        : observed !== null && observed !== undefined;
    return {
      definition,
      outcome: notEmpty ? 'passed' : 'triggered',
      observedValue: observed,
      message: notEmpty
        ? 'Entity adı mevcut.'
        : 'Entity adı eksik veya boş.'
    };
  }

  const numeric = toNumber(observed);
  if (numeric === null || typeof definition.threshold !== 'number') {
    return {
      definition,
      outcome: 'skipped',
      observedValue: observed,
      threshold: definition.threshold,
      message: 'Sayısal karşılaştırma yapılamadı.',
      skipReason: 'Numeric observed value or threshold missing.'
    };
  }

  const violated = compareNumeric(
    numeric,
    definition.operator,
    definition.threshold
  );

  return {
    definition,
    outcome: violated ? 'triggered' : 'passed',
    observedValue: numeric,
    threshold: definition.threshold,
    message: violated
      ? `Eşik ihlali: ${numeric} ${definition.operator} ${definition.threshold}`
      : `Eşik içinde: ${numeric} (eşik ${definition.threshold})`
  };
}

function toFinding(evaluation: RuleEvaluation): AnalysisFinding {
  return {
    id: `finding-${evaluation.definition.id}`,
    code: evaluation.definition.id.toUpperCase().replace(/-/g, '_'),
    title: evaluation.definition.name,
    description: evaluation.message,
    severity: mapSeverityToFinding(evaluation.definition.severity),
    kpiId: evaluation.definition.kpiId,
    ruleId: evaluation.definition.id
  };
}

function createSkippedResult(
  reason: string,
  code: string,
  definitions: readonly RuleDefinition[]
): RuleResult {
  const now = new Date().toISOString();
  const evaluations: RuleEvaluation[] = definitions.map((definition) => ({
    definition,
    outcome: 'skipped' as const,
    message: reason,
    skipReason: reason,
    durationMs: 0,
    threshold: definition.threshold
  }));

  return {
    evaluations: Object.freeze(evaluations),
    triggeredRules: Object.freeze([]),
    passedRules: Object.freeze([]),
    skippedRules: Object.freeze(evaluations),
    summary: {
      evaluatedCount: evaluations.length,
      triggeredCount: 0,
      passedCount: 0,
      skippedCount: evaluations.length,
      success: false
    },
    warnings: Object.freeze([{ code, message: reason }]),
    findings: Object.freeze([]),
    telemetry: {
      durationMs: 0,
      startedAt: now,
      endedAt: now,
      evaluatedRuleCount: evaluations.length,
      triggeredRuleCount: 0,
      passedRuleCount: 0,
      skippedRuleCount: evaluations.length,
      warningCount: 1
    }
  };
}

/**
 * Rule Engine Runtime.
 */
export class RuleEngineRuntime implements IRuleEngine {
  private readonly registry: RuleRegistryRuntime;

  constructor(registry?: RuleRegistryRuntime) {
    this.registry = registry ?? createRuleRegistryRuntime(true);
  }

  getRegistry(): RuleRegistryRuntime {
    return this.registry;
  }

  /**
   * Foundation `IRuleEngine.evaluate` — tetiklenen kurallar için Finding döner.
   */
  async evaluate(
    context: AnalysisContext,
    dataset: BusinessDataset,
    kpiResults: readonly FoundationKPIResult[],
    ruleIds: readonly string[]
  ): Promise<readonly AnalysisFinding[]> {
    const result = this.compute(
      createRuleContext({
        dataset,
        kpiResults,
        analysisContext: context,
        locale: context.locale,
        ruleIds
      })
    );
    return result.findings;
  }

  /**
   * Detaylı runtime sonucu.
   */
  compute(context: RuleContext): RuleResult {
    const timer = startAnalysisStageTimer();
    const startMark = nowMs();
    const warnings: RuleWarning[] = [];

    if (!context?.dataset || typeof context.dataset !== 'object') {
      const timing = endAnalysisStageTimer(timer);
      warnings.push({
        code: 'DATASET_MISSING',
        message: 'Rule değerlendirmesi için dataset zorunludur.'
      });
      return {
        evaluations: Object.freeze([]),
        triggeredRules: Object.freeze([]),
        passedRules: Object.freeze([]),
        skippedRules: Object.freeze([]),
        summary: {
          evaluatedCount: 0,
          triggeredCount: 0,
          passedCount: 0,
          skippedCount: 0,
          success: false
        },
        warnings: Object.freeze(warnings),
        findings: Object.freeze([]),
        telemetry: {
          durationMs:
            timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
          startedAt: timing.startedAt,
          endedAt: timing.endedAt,
          evaluatedRuleCount: 0,
          triggeredRuleCount: 0,
          passedRuleCount: 0,
          skippedRuleCount: 0,
          warningCount: warnings.length
        }
      };
    }

    if (context.kpiRuntimeResult && context.kpiRuntimeResult.summary.success === false) {
      const requested =
        context.ruleIds && context.ruleIds.length > 0
          ? context.ruleIds
              .map((id) => this.registry.getById(id))
              .filter((item): item is RuleDefinition => Boolean(item))
          : this.registry.getEnabled();
      return createSkippedResult(
        'KPI Engine başarısız; Rule Engine SKIPPED.',
        'KPI_FAILED',
        requested
      );
    }

    if (!Array.isArray(context.kpiResults)) {
      const requested = this.registry.getEnabled();
      return createSkippedResult(
        'KPI sonuçları yok; Rule Engine SKIPPED.',
        'KPI_RESULTS_MISSING',
        requested
      );
    }

    const requestedIds =
      context.ruleIds && context.ruleIds.length > 0
        ? [...context.ruleIds]
        : this.registry.getEnabled().map((item) => item.id);

    const evaluations: RuleEvaluation[] = [];
    const triggered: RuleEvaluation[] = [];
    const passed: RuleEvaluation[] = [];
    const skipped: RuleEvaluation[] = [];
    const findings: AnalysisFinding[] = [];

    for (const ruleId of requestedIds) {
      const ruleTimer = startAnalysisStageTimer();
      const definition = this.registry.getById(ruleId);

      if (!definition) {
        const timing = endAnalysisStageTimer(ruleTimer);
        warnings.push({
          code: 'RULE_NOT_REGISTERED',
          message: `Kural kayıtlı değil: ${ruleId}`,
          ruleId
        });
        const evaluation: RuleEvaluation = {
          definition: {
            id: ruleId,
            name: ruleId,
            description: 'Kayıtlı olmayan kural',
            category: 'data-quality',
            severity: 'INFO',
            operator: 'eq',
            order: Number.MAX_SAFE_INTEGER,
            enabled: true
          },
          outcome: 'skipped',
          message: 'Kural registry içinde bulunamadı.',
          skipReason: 'Rule not registered.',
          durationMs: timing.durationMs
        };
        evaluations.push(evaluation);
        skipped.push(evaluation);
        continue;
      }

      const partial = evaluateDefinition(definition, context.kpiResults);
      const timing = endAnalysisStageTimer(ruleTimer);
      const evaluation: RuleEvaluation = {
        ...partial,
        durationMs: timing.durationMs
      };
      evaluations.push(evaluation);

      if (evaluation.outcome === 'triggered') {
        triggered.push(evaluation);
        findings.push(toFinding(evaluation));
      } else if (evaluation.outcome === 'passed') {
        passed.push(evaluation);
      } else {
        skipped.push(evaluation);
      }
    }

    const timing = endAnalysisStageTimer(timer);
    const telemetry: RuleTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      evaluatedRuleCount: evaluations.length,
      triggeredRuleCount: triggered.length,
      passedRuleCount: passed.length,
      skippedRuleCount: skipped.length,
      warningCount: warnings.length
    };

    return {
      evaluations: Object.freeze(evaluations),
      triggeredRules: Object.freeze(triggered),
      passedRules: Object.freeze(passed),
      skippedRules: Object.freeze(skipped),
      summary: {
        evaluatedCount: evaluations.length,
        triggeredCount: triggered.length,
        passedCount: passed.length,
        skippedCount: skipped.length,
        success: evaluations.length > 0 && skipped.length < evaluations.length
      },
      warnings: Object.freeze(warnings),
      findings: Object.freeze(findings),
      telemetry
    };
  }
}

export function createRuleEngineRuntime(
  registry?: RuleRegistryRuntime
): RuleEngineRuntime {
  return new RuleEngineRuntime(registry);
}

export default RuleEngineRuntime;
