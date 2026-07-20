/**
 * İSTEBUL Business Analysis Engine — Finding Builder runtime sonucu (PR-102D).
 */

import type { AnalysisFinding } from '../../models/AnalysisFinding';
import type { FindingCategory } from './FindingCategory';
import type { FindingSeverity } from './FindingDefinition';
import type { FindingRecord } from './FindingRecord';

/**
 * Finding uyarısı.
 */
export interface FindingWarning {
  code: string;
  message: string;
  findingId?: string;
}

/**
 * Finding özeti.
 */
export interface FindingSummary {
  findingCount: number;
  informationalCount: number;
  warningCount: number;
  categoryCounts: Readonly<Partial<Record<FindingCategory, number>>>;
  severityCounts: Readonly<Partial<Record<FindingSeverity, number>>>;
  success: boolean;
}

/**
 * Finding telemetrisi.
 */
export interface FindingTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  findingCount: number;
  categoryCount: number;
  severityDistribution: Readonly<Partial<Record<FindingSeverity, number>>>;
  warningCount: number;
}

/**
 * Finding Builder Runtime çıktısı.
 */
export interface FindingResult {
  /** Zengin finding kayıtları */
  records: readonly FindingRecord[];
  /** Foundation AnalysisFinding listesi */
  findings: readonly AnalysisFinding[];
  /** Özet */
  summary: FindingSummary;
  /** Uyarılar */
  warnings: readonly FindingWarning[];
  /** Telemetri */
  telemetry: FindingTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_FINDING_RUNTIME_RESULT_KEY =
  'findingRuntimeResult' as const;
