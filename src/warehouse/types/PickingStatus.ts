export const PICKING_STATUSES = [
  "draft",
  "planned",
  "released",
  "in_progress",
  "partially_completed",
  "completed",
  "cancelled",
] as const;

export type PickingStatus =
  (typeof PICKING_STATUSES)[number];

export const PICKING_STATUS_LABELS: Record<
  PickingStatus,
  string
> = {
  draft: "Taslak",
  planned: "Planlandı",
  released: "Toplamaya Açıldı",
  in_progress: "Toplama Devam Ediyor",
  partially_completed: "Kısmen Toplandı",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export function isPickingStatus(
  value: unknown,
): value is PickingStatus {
  return (
    typeof value === "string" &&
    PICKING_STATUSES.includes(value as PickingStatus)
  );
}
