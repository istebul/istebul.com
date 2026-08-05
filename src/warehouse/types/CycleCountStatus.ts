export const CYCLE_COUNT_STATUSES = [
  "draft",
  "planned",
  "released",
  "assigned",
  "in_progress",
  "counted",
  "recount_required",
  "under_review",
  "approved",
  "adjusted",
  "completed",
  "cancelled",
] as const;

export type CycleCountStatus =
  (typeof CYCLE_COUNT_STATUSES)[number];

export const CYCLE_COUNT_STATUS_LABELS: Record<
  CycleCountStatus,
  string
> = {
  draft: "Taslak",
  planned: "Planlandı",
  released: "Sayıma Açıldı",
  assigned: "Görev Atandı",
  in_progress: "Sayım Devam Ediyor",
  counted: "Sayım Tamamlandı",
  recount_required: "Yeniden Sayım Gerekli",
  under_review: "İnceleme Bekliyor",
  approved: "Onaylandı",
  adjusted: "Stok Düzeltmesi Yapıldı",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export function isCycleCountStatus(
  value: unknown,
): value is CycleCountStatus {
  return (
    typeof value === "string" &&
    CYCLE_COUNT_STATUSES.includes(
      value as CycleCountStatus,
    )
  );
}
