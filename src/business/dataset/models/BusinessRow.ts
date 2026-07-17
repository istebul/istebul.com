/**
 * İSTEBUL Business — satır tip sözleşmesi.
 */

/**
 * Hücre değeri — tip güvenliği sonraki katmanlarda daraltılır.
 */
export type BusinessCellValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | readonly unknown[];

/**
 * Tek bir veri satırı.
 *
 * `values` anahtarları `BusinessColumn.id` ile eşleşir.
 */
export interface BusinessRow {
  /** Satır kimliği — entity içinde benzersiz */
  id: string;
  /** Sütun kimliği → hücre değeri */
  values: Readonly<Record<string, BusinessCellValue>>;
  /** Kaynak satır referansı (dosya satır no, API id vb.) */
  sourceRef?: string;
}
