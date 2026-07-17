/**
 * İSTEBUL Business Dashboard Engine — filtre modeli.
 */

/**
 * Filtre türü.
 */
export type DashboardFilterKind =
  | 'donem'
  | 'kategori'
  | 'entity'
  | 'metin'
  | 'sayi-aralik'
  | 'ozel';

/**
 * Dashboard filtresi — UI bağlanmaz; yalnızca sözleşme.
 */
export interface DashboardFilter {
  /** Filtre kimliği */
  id: string;
  /** Tür */
  kind: DashboardFilterKind;
  /** Etiket (Türkçe) */
  label: string;
  /** Alan anahtarı */
  fieldKey: string;
  /** Varsayılan değer */
  defaultValue?: string | number | boolean | null;
  /** Seçenekler — sonraki PR */
  options?: readonly Readonly<{ value: string; label: string }>[];
}
