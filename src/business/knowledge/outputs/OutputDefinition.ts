/**
 * İSTEBUL Business — çıktı formatı tip sözleşmeleri.
 *
 * Bu dosya yalnızca veri modeli tanımlar.
 * Dosya üretimi veya dışa aktarma iş mantığı içermez.
 */

/**
 * Desteklenen çıktı formatı kimlikleri.
 */
export type OutputFormatId =
  | 'dashboard'
  | 'pdf'
  | 'word'
  | 'powerpoint'
  | 'excel'
  | 'csv'
  | 'json';

/**
 * Tek bir çıktı formatı tanımı.
 *
 * Alan sözlüğü (TR):
 * - id → Kimlik
 * - name → Ad
 * - description → Açıklama
 * - mimeType → MIME türü (bilindiği ölçüde)
 * - fileExtension → Dosya uzantısı (dashboard için boş olabilir)
 * - order → Sıralama
 */
export interface OutputDefinition {
  /** Kimlik — kararlı teknik anahtar */
  id: OutputFormatId;
  /** Ad — kullanıcıya görünen Türkçe format adı */
  name: string;
  /** Açıklama — formatın kullanım amacı */
  description: string;
  /** MIME türü — bilinmiyorsa boş bırakılabilir */
  mimeType: string;
  /** Dosya uzantısı — örn. `.pdf`; dashboard için `''` */
  fileExtension: string;
  /** Sıralama — düşük sayı önce */
  order: number;
}
