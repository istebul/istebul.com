/**
 * İSTEBUL Business Import Engine — hata tipi.
 */

import type { ImportStage } from './ImportStage';

/**
 * İçe aktarma sırasında oluşan yapılandırılmış hata.
 */
export interface ImportError {
  /** Hata kodu — kararlı makine anahtarı */
  code: string;
  /** Kullanıcıya yönelik mesaj (Türkçe) */
  message: string;
  /** İlgili pipeline aşaması */
  stage?: ImportStage;
  /** Teknik detay — log için; UI’da gösterilmez */
  detail?: string;
  /** Kurtarılabilir mi — yeniden deneme önerisi */
  recoverable?: boolean;
}
