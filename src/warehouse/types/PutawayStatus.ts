export const PUTAWAY_STATUSES = [
  "draft",
  "planned",
  "in_progress",
  "partially_completed",
  "completed",
  "cancelled",
] as const;

export type PutawayStatus =
  (typeof PUTAWAY_STATUSES)[number];

export const PUTAWAY_STATUS_LABELS: Record<
  PutawayStatus,
  string
> = {
  draft: "Taslak",
  planned: "Planlandı",
  in_progress: "Yerleştirme Devam Ediyor",
  partially_completed: "Kısmen Yerleştirildi",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export function isPutawayStatus(
  value: unknown,
): value is PutawayStatus {
  return (
    typeof value === "string" &&
    PUTAWAY_STATUSES.includes(value as PutawayStatus)
  );
}
