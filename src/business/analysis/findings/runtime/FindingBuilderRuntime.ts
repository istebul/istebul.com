/**
 * İSTEBUL Business Analysis Engine — FindingBuilderRuntime (PR-102D).
 *
 * Rule Engine çıktılarından standart finding nesneleri üretir.
 * Yorum / karar / öneri üretmez.
 */

import type { AnalysisContext } from '../../models/AnalysisContext';
import type {
  AnalysisFinding,
  AnalysisFindingSeverity
} from '../../models/AnalysisFinding';
import type { KPIResult as FoundationKPIResult } from '../../models/KPIResult';
import type { IFindingBuilder } from '../../ports/IFindingBuilder';
import type { RuleEvaluation } from '../../rules/runtime/RuleEvaluation';
import type { RuleSeverity } from '../../rules/runtime/RuleDefinition';
import type { RuleCategory } from '../../rules/runtime/RuleDefinition';
import {
  endAnalysisStageTimer,
  nowMs,
  startAnalysisStageTimer
} from '../../pipeline/runtime/AnalysisTiming';
import type { FindingCategory } from './FindingCategory';
import type { FindingContext } from './FindingContext';
import { createFindingContext } from './FindingContext';
import type {
  FindingDefinition,
  FindingSeverity
} from './FindingDefinition';
import type { FindingRecord } from './FindingRecord';
import type { FindingRegistryRuntime } from './FindingRegistryRuntime';
import { createFindingRegistryRuntime } from './FindingRegistryRuntime';
import type {
  FindingResult,
  FindingSummary,
  FindingTelemetry,
  FindingWarning
} from './FindingResult';

function mapRuleSeverityToFindingSeverity(
  severity: RuleSeverity
): FindingSeverity {
  return severity;
}

function mapFindingSeverityToFoundation(
  severity: FindingSeverity
): AnalysisFindingSeverity {
  if (severity === 'INFO') {
    return 'bilgi';
  }
  if (severity === 'WARNING') {
    return 'uyari';
  }
  return 'kritik';
}

function mapRuleCategoryToFindingCategory(
  category: RuleCategory
): FindingCategory {
  return category;
}

function resolveDefinition(
  registry: FindingRegistryRuntime,
  evaluation: RuleEvaluation
): FindingDefinition {
  const fromRule = registry.getBySourceRuleId(evaluation.definition.id);
  if (fromRule) {
    return fromRule;
  }

  return {
    id: `finding-${evaluation.definition.id}`,
    code: evaluation.definition.id.toUpperCase().replace(/-/g, '_'),
    title: evaluation.definition.name,
    description: evaluation.definition.description,
    category: mapRuleCategoryToFindingCategory(evaluation.definition.category),
    defaultSeverity: mapRuleSeverityToFindingSeverity(
      evaluation.definition.severity
    ),
    sourceRuleId: evaluation.definition.id,
    order: evaluation.definition.order,
    enabled: true
  };
}

function buildRecordFromTriggered(
  evaluation: RuleEvaluation,
  definition: FindingDefinition,
  index: number
): FindingRecord {
  const severity = mapRuleSeverityToFindingSeverity(
    evaluation.definition.severity
  );
  const id = `finding-${evaluation.definition.id}-${index}`;
  const title = definition.title || evaluation.definition.name;
  const description = evaluation.message || definition.description;
  const sourceRule = evaluation.definition.id;
  const sourceKpi = evaluation.definition.kpiId;
  const category = definition.category;

  const finding: AnalysisFinding = {
    id,
    code: definition.code,
    title,
    description,
    severity: mapFindingSeverityToFoundation(severity),
    kpiId: sourceKpi,
    ruleId: sourceRule
  };

  return {
    id,
    title,
    description,
    category,
    severity,
    sourceRule,
    sourceKpi,
    entityReference: undefined,
    metadata: Object.freeze({
      outcome: evaluation.outcome,
      observedValue:
        evaluation.observedValue === undefined
          ? null
          : evaluation.observedValue,
      threshold:
        evaluation.threshold === undefined ? null : evaluation.threshold,
      ruleCategory: evaluation.definition.category,
      ruleSeverity: evaluation.definition.severity
    }),
    finding,
    informational: false
  };
}

function buildRecordFromSkipped(
  evaluation: RuleEvaluation,
  index: number
): FindingRecord {
  const id = `finding-info-${evaluation.definition.id}-${index}`;
  const title = `Skipped: ${evaluation.definition.name}`;
  const description =
    evaluation.skipReason || evaluation.message || 'Kural atlandı.';

  const finding: AnalysisFinding = {
    id,
    code: `SKIPPED_${evaluation.definition.id.toUpperCase().replace(/-/g, '_')}`,
    title,
    description,
    severity: 'bilgi',
    kpiId: evaluation.definition.kpiId,
    ruleId: evaluation.definition.id
  };

  return {
    id,
    title,
    description,
    category: 'informational',
    severity: 'INFO',
    sourceRule: evaluation.definition.id,
    sourceKpi: evaluation.definition.kpiId,
    entityReference: undefined,
    metadata: Object.freeze({
      outcome: evaluation.outcome,
      skipReason: evaluation.skipReason ?? null,
      observedValue:
        evaluation.observedValue === undefined
          ? null
          : evaluation.observedValue
    }),
    finding,
    informational: true
  };
}

function emptyResult(
  warnings: FindingWarning[],
  timing: { startedAt: string; endedAt: string; durationMs: number }
): FindingResult {
  const summary: FindingSummary = {
    findingCount: 0,
    informationalCount: 0,
    warningCount: warnings.length,
    categoryCounts: Object.freeze({}),
    severityCounts: Object.freeze({}),
    success: false
  };
  const telemetry: FindingTelemetry = {
    durationMs: timing.durationMs,
    startedAt: timing.startedAt,
    endedAt: timing.endedAt,
    findingCount: 0,
    categoryCount: 0,
    severityDistribution: Object.freeze({}),
    warningCount: warnings.length
  };
  return {
    records: Object.freeze([]),
    findings: Object.freeze([]),
    summary,
    warnings: Object.freeze(warnings),
    telemetry
  };
}

/**
 * Finding Builder Runtime.
 */
export class FindingBuilderRuntime implements IFindingBuilder {
  private readonly registry: FindingRegistryRuntime;

  constructor(registry?: FindingRegistryRuntime) {
    this.registry = registry ?? createFindingRegistryRuntime(true);
  }

  getRegistry(): FindingRegistryRuntime {
    return this.registry;
  }

  /**
   * Foundation `IFindingBuilder.build`.
   */
  async build(
    context: AnalysisContext,
    kpiResults: readonly FoundationKPIResult[],
    ruleFindings: readonly AnalysisFinding[]
  ): Promise<readonly AnalysisFinding[]> {
    const result = this.compute(
      createFindingContext({
        analysisContext: context,
        kpiResults,
        ruleFindings,
        locale: context.locale,
        includeSkippedInfo: false
      })
    );
    return result.findings;
  }

  /**
   * Detaylı runtime sonucu — triggered → finding; passed → yok; skipped → opsiyonel bilgi.
   */
  compute(context: FindingContext): FindingResult {
    const timer = startAnalysisStageTimer();
    const startMark = nowMs();
    const warnings: FindingWarning[] = [];
    const records: FindingRecord[] = [];

    const ruleResult = context.ruleResult;

    if (!ruleResult && (!context.ruleFindings || context.ruleFindings.length === 0)) {
      const timing = endAnalysisStageTimer(timer);
      warnings.push({
        code: 'RULE_RESULT_MISSING',
        message: 'Finding üretimi için RuleResult veya ruleFindings gerekli.'
      });
      return emptyResult(warnings, {
        ...timing,
        durationMs:
          timing.durationMs || Math.max(0, Math.round(nowMs() - startMark))
      });
    }

    if (ruleResult) {
      let index = 0;
      for (const evaluation of ruleResult.triggeredRules) {
        const definition = resolveDefinition(this.registry, evaluation);
        if (!definition.enabled) {
          warnings.push({
            code: 'FINDING_DEFINITION_DISABLED',
            message: `Finding tanımı pasif: ${definition.id}`,
            findingId: definition.id
          });
          continue;
        }
        records.push(buildRecordFromTriggered(evaluation, definition, index));
        index += 1;
      }

      // Passed → finding oluşturma (bilinçli no-op)

      if (context.includeSkippedInfo !== false) {
        for (const evaluation of ruleResult.skippedRules) {
          records.push(buildRecordFromSkipped(evaluation, index));
          index += 1;
        }
      }
    } else if (context.ruleFindings) {
      // Fallback: foundation findings listesini kayıt olarak sar
      context.ruleFindings.forEach((finding, index) => {
        const severity: FindingSeverity =
          finding.severity === 'bilgi'
            ? 'INFO'
            : finding.severity === 'uyari'
              ? 'WARNING'
              : 'ERROR';
        const def = finding.ruleId
          ? this.registry.getBySourceRuleId(finding.ruleId)
          : undefined;
        records.push({
          id: finding.id || `finding-fallback-${index}`,
          title: finding.title,
          description: finding.description,
          category: def?.category ?? 'informational',
          severity: def?.defaultSeverity ?? severity,
          sourceRule: finding.ruleId,
          sourceKpi: finding.kpiId,
          entityReference: finding.entityId,
          metadata: Object.freeze({
            code: finding.code,
            source: 'ruleFindings'
          }),
          finding,
          informational: finding.severity === 'bilgi'
        });
      });
    }

    const categoryCounts: Partial<Record<FindingCategory, number>> = {};
    const severityCounts: Partial<Record<FindingSeverity, number>> = {};
    let informationalCount = 0;

    for (const record of records) {
      categoryCounts[record.category] =
        (categoryCounts[record.category] ?? 0) + 1;
      severityCounts[record.severity] =
        (severityCounts[record.severity] ?? 0) + 1;
      if (record.informational) {
        informationalCount += 1;
      }
    }

    const findings = records
      .filter((record) => !record.informational)
      .map((record) => record.finding);

    const timing = endAnalysisStageTimer(timer);
    const categoryCount = Object.keys(categoryCounts).length;

    const summary: FindingSummary = {
      findingCount: findings.length,
      informationalCount,
      warningCount: warnings.length,
      categoryCounts: Object.freeze(categoryCounts),
      severityCounts: Object.freeze(severityCounts),
      success: findings.length > 0 || informationalCount > 0 || Boolean(ruleResult)
    };

    const telemetry: FindingTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      findingCount: findings.length,
      categoryCount,
      severityDistribution: Object.freeze({ ...severityCounts }),
      warningCount: warnings.length
    };

    return {
      records: Object.freeze(records),
      findings: Object.freeze(findings),
      summary,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createFindingBuilderRuntime(
  registry?: FindingRegistryRuntime
): FindingBuilderRuntime {
  return new FindingBuilderRuntime(registry);
}

export default FindingBuilderRuntime;
