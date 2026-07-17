/**
 * İSTEBUL Business Analysis Engine — KPI sonuç modeli.
 */

/**
 * Tek bir KPI hesaplama çıktısı (değer henüz hesaplanmaz; tip sözleşmesi).
 */
export interface KPIResult {
  /** KPI kimliği — Knowledge KPIRegistry ile uyumlu */
  kpiId: string;
  /** Görünen ad */
  name: string;
  /** Birim */
  unit: string;
  /** Sayısal veya metin değer — motor tipi bilir */
  value: string | number | null;
  /** Hesaplanamadıysa neden */
  unavailableReason?: string;
  /** Güven / veri kalitesi 0–1 */
  confidence?: number;
}
