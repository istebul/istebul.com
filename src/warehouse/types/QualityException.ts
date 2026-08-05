export const QUALITY_EXCEPTION_TYPES = [
  "rule_failed",
  "sample_failed",
  "temperature_out_of_range",
  "dimension_out_of_range",
  "packaging_damage",
  "barcode_mismatch",
  "label_mismatch",
  "lot_mismatch",
  "serial_number_mismatch",
  "expiry_date_invalid",
  "document_missing",
  "laboratory_result_failed",
] as const;

export type QualityExceptionType =
  (typeof QUALITY_EXCEPTION_TYPES)[number];

export const QUALITY_EXCEPTION_TYPE_LABELS: Record<
  QualityExceptionType,
  string
> = {
  rule_failed: "Kalite Kuralı Başarısız",
  sample_failed: "Numune Kontrolü Başarısız",
  temperature_out_of_range: "Sıcaklık Aralık Dışında",
  dimension_out_of_range: "Ölçü Aralık Dışında",
  packaging_damage: "Ambalaj Hasarlı",
  barcode_mismatch: "Barkod Uyuşmazlığı",
  label_mismatch: "Etiket Uyuşmazlığı",
  lot_mismatch: "Lot Uyuşmazlığı",
  serial_number_mismatch: "Seri Numarası Uyuşmazlığı",
  expiry_date_invalid: "Son Kullanma Tarihi Geçersiz",
  document_missing: "Kalite Belgesi Eksik",
  laboratory_result_failed: "Laboratuvar Sonucu Başarısız",
};

export interface QualityException {
  readonly id: string;
  readonly tenantId: string;
  readonly inspectionId: string;
  readonly inspectionItemId?: string;
  readonly type: QualityExceptionType;
  readonly message: string;
  readonly ruleId?: string;
  readonly sampleId?: string;
  readonly expectedValue?: string;
  readonly actualValue?: string;
  readonly resolved: boolean;
  readonly resolvedBy?: string;
  readonly resolvedAt?: string;
  readonly resolutionNotes?: string;
  readonly createdAt: string;
}

export function isQualityExceptionType(
  value: unknown,
): value is QualityExceptionType {
  return (
    typeof value === "string" &&
    QUALITY_EXCEPTION_TYPES.includes(
      value as QualityExceptionType,
    )
  );
}
