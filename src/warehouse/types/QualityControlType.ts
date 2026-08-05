export const QUALITY_CONTROL_TYPES = [
  "receiving_inspection",
  "sampling_inspection",
  "visual_inspection",
  "dimensional_inspection",
  "temperature_inspection",
  "packaging_inspection",
  "barcode_inspection",
  "label_inspection",
  "laboratory_inspection",
  "final_inspection",
] as const;

export type QualityControlType =
  (typeof QUALITY_CONTROL_TYPES)[number];

export const QUALITY_CONTROL_TYPE_LABELS: Record<
  QualityControlType,
  string
> = {
  receiving_inspection: "Mal Kabul Kontrolü",
  sampling_inspection: "Numune Kontrolü",
  visual_inspection: "Görsel Kontrol",
  dimensional_inspection: "Ölçü Kontrolü",
  temperature_inspection: "Sıcaklık Kontrolü",
  packaging_inspection: "Ambalaj Kontrolü",
  barcode_inspection: "Barkod Kontrolü",
  label_inspection: "Etiket Kontrolü",
  laboratory_inspection: "Laboratuvar Kontrolü",
  final_inspection: "Nihai Kalite Kontrolü",
};

export function isQualityControlType(
  value: unknown,
): value is QualityControlType {
  return (
    typeof value === "string" &&
    QUALITY_CONTROL_TYPES.includes(
      value as QualityControlType,
    )
  );
}
