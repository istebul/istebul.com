export const REPLENISHMENT_STATUSES = [
  "draft",
  "planned",
  "released",
  "assigned",
  "in_progress",
  "partially_completed",
  "completed",
  "exception",
  "cancelled",
] as const;

export type ReplenishmentStatus =
  (typeof REPLENISHMENT_STATUSES)[number];

export const REPLENISHMENT_STATUS_LABELS: Record<
  ReplenishmentStatus,
  string
> = {
  draft: "Taslak",
  planned: "Planlandı",
  released: "İkmale Açıldı",
  assigned: "Görev Atandı",
  in_progress: "İkmal Devam Ediyor",
  partially_completed: "Kısmen Tamamlandı",
  completed: "Tamamlandı",
  exception: "İstisna Bekliyor",
  cancelled: "İptal Edildi",
};

export function isReplenishmentStatus(
  value: unknown,
): value is ReplenishmentStatus {
  return (
    typeof value === "string" &&
    REPLENISHMENT_STATUSES.includes(
      value as ReplenishmentStatus,
    )
  );
}
