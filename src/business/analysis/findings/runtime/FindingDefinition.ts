/**
 * İSTEBUL Business Analysis Engine — runtime finding tanımı (PR-102D).
 *
 * Foundation `FindingTemplateDefinition` / `AnalysisFinding` sözleşmelerini değiştirmez.
 */

import type { FindingCategory } from './FindingCategory';

/**
 * Finding önem derecesi — Rule Engine severity ile uyumlu.
 */
export type FindingSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * Runtime finding şablon / tanım kaydı.
 */
export interface FindingDefinition {
  /** Kararlı kimlik */
  id: string;
  /** Bulgu kodu */
  code: string;
  /** Başlık şablonu */
  title: string;
  /** Açıklama şablonu */
  description: string;
  /** Kategori */
  category: FindingCategory;
  /** Varsayılan önem */
  defaultSeverity: FindingSeverity;
  /** Kaynak kural kimliği — eşleme için */
  sourceRuleId?: string;
  /** Sıra */
  order: number;
  /** Aktif mi */
  enabled: boolean;
}

export const FINDING_SEVERITY_RANK: Readonly<Record<FindingSeverity, number>> =
  Object.freeze({
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    CRITICAL: 4
  });
