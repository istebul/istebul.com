/**
 * İSTEBUL Business Import Engine — DetectedColumn (PR-101D).
 */

import type { DetectionConfidence } from './DetectionConfidence';
import type { DetectedType } from './DetectedType';

/**
 * Aday alan eşlemesi — semantik mapping değildir; yalnızca isim sezgisi.
 */
export interface CandidateField {
  /** Alan anahtarı (normalize edilmiş) */
  fieldKey: string;
  /** Güven */
  confidence: DetectionConfidence;
  /** Eşleşme gerekçesi */
  reason?: string;
}

/**
 * Tespit edilmiş sütun.
 */
export interface DetectedColumn {
  /** Kolon adı */
  name: string;
  /** Sıra */
  index: number;
  /** İlkel tip */
  detectedType: DetectedType;
  /** Null / boş değer içeriyor mu */
  nullable: boolean;
  /** Koleksiyon değerleri (dizi) gözlendi mi */
  isCollection: boolean;
  /** Örnek değerler */
  sampleValues: readonly unknown[];
  /** Benzersiz oran [0,1] */
  uniqueRatio: number;
  /** Boş oran [0,1] */
  emptyRatio: number;
  /** Tip / yapı güveni */
  confidence: DetectionConfidence;
  /** Aday alanlar */
  candidateFields: readonly CandidateField[];
}
