/**
 * İSTEBUL Business Analysis Engine — uyarı modeli.
 */

import type { AnalysisStage } from './AnalysisStage';

/**
 * Analiz uyarısı — iş başarılı olsa da iletilir.
 */
export interface AnalysisWarning {
  /** Uyarı kodu */
  code: string;
  /** Mesaj (Türkçe) */
  message: string;
  /** İlgili aşama */
  stage?: AnalysisStage;
}
