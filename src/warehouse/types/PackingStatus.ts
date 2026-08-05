export const PACKING_STATUSES = [
  "draft",
  "planned",
  "released",
  "in_progress",
  "partially_packed",
  "packed",
  "shipping_ready",
  "cancelled",
] as const;

export type PackingStatus =
  (typeof PACKING_STATUSES)[number];

export const PACKING_STATUS_LABELS: Record<
  PackingStatus,
  string
> = {
  draft: "Taslak",
  planned: "Planlandı",
  released: "Paketlemeye Açıldı",
  in_progress: "Paketleme Devam Ediyor",
  partially_packed: "Kısmen Paketlendi",
  packed: "Paketlendi",
  shipping_ready: "Sevkiyata Hazır",
  cancelled: "İptal Edildi",
};

export function isPackingStatus(
  value: unknown,
): value is PackingStatus {
  return (
    typeof value === "string" &&
    PACKING_STATUSES.includes(
      value as PackingStatus,
    )
  );
}
