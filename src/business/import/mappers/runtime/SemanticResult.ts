/**
 * İSTEBUL Business Import Engine — SemanticResult (PR-101G).
 */

import type { SemanticColumnMapping, SemanticMappingResult } from '../../ports/ISemanticMapper';
import type { SemanticCandidate } from './SemanticCandidate';

/**
 * Confidence dağılımı.
 */
export interface SemanticConfidenceDistribution {
  high: number;
  medium: number;
  low: number;
}

/**
 * Semantik eşleme telemetrisi.
 */
export interface SemanticMappingTelemetry {
  /** Kayıtlı kural sayısı */
  ruleCount: number;
  /** Çalıştırılan kural sayısı (kolon × kural çağrıları) */
  rulesExecuted: number;
  /** En az bir aday üreten kural çalışma sayısı */
  rulesMatched: number;
  /** Toplam birincil eşleşme */
  totalMatches: number;
  /** Eşlenemeyen kolon */
  unmappedCount: number;
  /** Confidence dağılımı (birincil eşleşmeler) */
  confidenceDistribution: SemanticConfidenceDistribution;
  /** Süre ms */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
}

/**
 * Tek kolon için eşleme çıktısı.
 */
export interface SemanticColumnResult {
  /** Kaynak kolon */
  sourceKey: string;
  /** Birincil business field (yoksa undefined) */
  businessField?: string;
  /** Birincil entity */
  entityType?: SemanticCandidate['entityType'];
  /** Birincil confidence */
  confidence?: number;
  /** Birincil reason */
  reason?: string;
  /** Birincil aday */
  primary?: SemanticCandidate;
  /** Alternatif adaylar */
  alternatives: readonly SemanticCandidate[];
  /** Tüm adaylar (primary + alternatives) */
  candidates: readonly SemanticCandidate[];
}

/**
 * Runtime semantik eşleme sonucu — BusinessDataset oluşturmaz.
 */
export interface SemanticResult {
  /** Kolon bazlı sonuçlar */
  columns: readonly SemanticColumnResult[];
  /** Foundation uyumlu mapping listesi */
  mappings: readonly SemanticColumnMapping[];
  /** Eşlenemeyen kolonlar */
  unmappedSourceKeys: readonly string[];
  /** Telemetri */
  telemetry: SemanticMappingTelemetry;
}

export const PIPELINE_BAG_SEMANTIC_RESULT_KEY = 'semanticMappingResult' as const;

/**
 * Foundation SemanticMappingResult projeksiyonu.
 */
export function toFoundationSemanticMappingResult(
  result: SemanticResult
): SemanticMappingResult {
  return {
    mappings: result.mappings,
    unmappedSourceKeys: result.unmappedSourceKeys
  };
}
