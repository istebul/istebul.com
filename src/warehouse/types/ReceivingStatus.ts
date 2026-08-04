export const RECEIVING_STATUSES = [
  "draft",
  "planned",
  "in_progress",
  "partially_received",
  "quality_control",
  "completed",
  "cancelled",
] as const;

export type ReceivingStatus =
  (typeof RECEIVING_STATUSES)[number];

export const RECEIVING_STATUS_LABELS: Record<
  ReceivingStatus,
  string
> = {
  draft: "Taslak",
  planned: "Planlandı",
  in_progress: "Mal Kabul Başladı",
  partially_received: "Kısmen Kabul Edildi",
  quality_control: "Kalite Kontrolde",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export function isReceivingStatus(
  value: unknown,
): value is ReceivingStatus {
  return (
    typeof value === "string" &&
    RECEIVING_STATUSES.includes(value as ReceivingStatus)
  );
}
