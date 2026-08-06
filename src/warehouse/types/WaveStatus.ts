export const WAVE_STATUSES = [
  "draft",
  "planned",
  "capacity_checked",
  "ready",
  "released",
  "assigned",
  "in_progress",
  "partially_completed",
  "completed",
  "paused",
  "exception",
  "cancelled",
] as const;

export type WaveStatus =
  (typeof WAVE_STATUSES)[number];

export const WAVE_STATUS_LABELS: Record<
  WaveStatus,
  string
> = {
  draft: "Taslak",
  planned: "Planlandı",
  capacity_checked: "Kapasite Kontrol Edildi",
  ready: "Serbest Bırakmaya Hazır",
  released: "Operasyona Açıldı",
  assigned: "Görevler Atandı",
  in_progress: "Dalga Devam Ediyor",
  partially_completed: "Kısmen Tamamlandı",
  completed: "Tamamlandı",
  paused: "Duraklatıldı",
  exception: "İstisna Bekliyor",
  cancelled: "İptal Edildi",
};

export function isWaveStatus(
  value: unknown,
): value is WaveStatus {
  return (
    typeof value === "string" &&
    WAVE_STATUSES.includes(
      value as WaveStatus,
    )
  );
}
