/**
 * İSTEBUL Business Report Engine — Narrative Composer runtime sonucu (PR-104C).
 */

import type { NarrativeRecord } from './NarrativeRecord';
import type { NarrativeKind } from './NarrativeKind';

/**
 * Narrative uyarısı.
 */
export interface NarrativeWarning {
  code: string;
  message: string;
  templateId?: string;
}

/**
 * Narrative telemetrisi.
 */
export interface NarrativeTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  narrativeCount: number;
  templateUsage: Readonly<Partial<Record<string, number>>>;
  kindDistribution: Readonly<Partial<Record<NarrativeKind, number>>>;
  warningCount: number;
}

/**
 * Narrative metadata.
 */
export interface NarrativeMetadata {
  reportModelId: string;
  locale: 'tr' | 'en';
  generatedAt: string;
  templateIds: readonly string[];
}

/**
 * Narrative Composer Runtime çıktısı.
 */
export interface NarrativeResult {
  /** Üretilmiş narrative kayıtları */
  narratives: readonly NarrativeRecord[];
  /** Metadata */
  metadata: NarrativeMetadata;
  /** Uyarılar */
  warnings: readonly NarrativeWarning[];
  /** Telemetri */
  telemetry: NarrativeTelemetry;
}

/** Pipeline bag anahtarı — Report Engine */
export const PIPELINE_BAG_NARRATIVE_RUNTIME_RESULT_KEY =
  'narrativeRuntimeResult' as const;
