/**
 * İSTEBUL Business Report Engine — Report Section Builder runtime sonucu (PR-104D).
 */

import type { ReportSection } from '../../models/ReportSection';
import type { ReportSectionRecord } from './ReportSectionRecord';

/**
 * Report Section uyarısı.
 */
export interface ReportSectionWarning {
  code: string;
  message: string;
  sectionId?: string;
}

/**
 * Report Section telemetrisi.
 */
export interface ReportSectionTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  sectionCount: number;
  templateMappingCount: number;
  warningCount: number;
}

/**
 * Report Section metadata.
 */
export interface ReportSectionMetadata {
  reportModelId: string;
  locale: 'tr' | 'en';
  generatedAt: string;
  sectionIds: readonly string[];
  mappedNarrativeKinds: readonly string[];
}

/**
 * Report Section Builder Runtime çıktısı.
 */
export interface ReportSectionResult {
  /** Zengin section kayıtları */
  records: readonly ReportSectionRecord[];
  /** Foundation ReportSection listesi */
  sections: readonly ReportSection[];
  /** Metadata */
  metadata: ReportSectionMetadata;
  /** Uyarılar */
  warnings: readonly ReportSectionWarning[];
  /** Telemetri */
  telemetry: ReportSectionTelemetry;
}

/** Pipeline bag anahtarı — Report Engine */
export const PIPELINE_BAG_REPORT_SECTION_RUNTIME_RESULT_KEY =
  'reportSectionRuntimeResult' as const;
