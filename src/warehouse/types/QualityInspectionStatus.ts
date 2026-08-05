export const QUALITY_INSPECTION_STATUSES = [
  "draft",
  "planned",
  "sampling",
  "in_progress",
  "waiting_result",
  "completed",
  "cancelled",
] as const;

export type QualityInspectionStatus =
  (typeof QUALITY_INSPECTION_STATUSES)[number];

export const QUALITY_INSPECTION_STATUS_LABELS: Record<
  QualityInspectionStatus,
  string
> = {
  draft: "Taslak",
  planned: "Planlandı",
  sampling: "Numune Alınıyor",
  in_progress: "Kontrol Devam Ediyor",
  waiting_result: "Sonuç Bekleniyor",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export function isQualityInspectionStatus(
  value: unknown,
): value is QualityInspectionStatus {
  return (
    typeof value === "string" &&
    QUALITY_INSPECTION_STATUSES.includes(
      value as QualityInspectionStatus,
    )
  );
}
