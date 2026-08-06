export const WAVE_RELEASE_STATUSES = [
  "pending",
  "validation_failed",
  "capacity_blocked",
  "approved",
  "released",
  "partially_released",
  "paused",
  "completed",
  "cancelled",
] as const;

export type WaveReleaseStatus =
  (typeof WAVE_RELEASE_STATUSES)[number];

export const WAVE_RELEASE_STATUS_LABELS: Record<
  WaveReleaseStatus,
  string
> = {
  pending: "Serbest Bırakma Bekliyor",
  validation_failed: "Doğrulama Başarısız",
  capacity_blocked: "Kapasite Nedeniyle Bloke",
  approved: "Onaylandı",
  released: "Serbest Bırakıldı",
  partially_released: "Kısmen Serbest Bırakıldı",
  paused: "Duraklatıldı",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export interface WaveRelease {
  readonly id: string;
  readonly tenantId: string;
  readonly waveId: string;
  readonly status: WaveReleaseStatus;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  readonly releasedBy?: string;
  readonly releasedAt?: string;
  readonly pausedBy?: string;
  readonly pausedAt?: string;
  readonly resumedBy?: string;
  readonly resumedAt?: string;
  readonly cancellationReason?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function isWaveReleaseStatus(
  value: unknown,
): value is WaveReleaseStatus {
  return (
    typeof value === "string" &&
    WAVE_RELEASE_STATUSES.includes(
      value as WaveReleaseStatus,
    )
  );
}
