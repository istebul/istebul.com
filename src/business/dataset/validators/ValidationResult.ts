/**
 * İSTEBUL Business — doğrulama bulgu tipleri.
 *
 * İş mantığı ve motor implementasyonu yoktur.
 */

/**
 * Bulgu önem derecesi.
 *
 * | Teknik | Türkçe |
 * |--------|--------|
 * | info | Bilgi |
 * | warning | Uyarı |
 * | error | Hata |
 */
export type ValidationSeverity = 'info' | 'warning' | 'error';

/** Görünen Türkçe etiketler */
export const VALIDATION_SEVERITY_LABELS: Readonly<
  Record<ValidationSeverity, string>
> = Object.freeze({
  info: 'Bilgi',
  warning: 'Uyarı',
  error: 'Hata'
});

/**
 * Bilgi düzeyinde bulgu (Info).
 */
export interface ValidationInfo {
  severity: 'info';
  code: string;
  message: string;
  entityId?: string;
  columnId?: string;
  rowId?: string;
}

/**
 * Uyarı düzeyinde bulgu (Warning).
 */
export interface ValidationWarning {
  severity: 'warning';
  code: string;
  message: string;
  entityId?: string;
  columnId?: string;
  rowId?: string;
}

/**
 * Hata düzeyinde bulgu (Error).
 */
export interface ValidationError {
  severity: 'error';
  code: string;
  message: string;
  entityId?: string;
  columnId?: string;
  rowId?: string;
}

/**
 * Tekil doğrulama sonucu (ValidationResult).
 */
export type ValidationResult =
  | ValidationInfo
  | ValidationWarning
  | ValidationError;

/**
 * Önem derecesi tipi (Severity) — `ValidationSeverity` ile aynı sözlük.
 */
export type Severity = ValidationSeverity;
