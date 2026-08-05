export const QUALITY_SAMPLE_STATUSES = [
  "planned",
  "collected",
  "under_review",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type QualitySampleStatus =
  (typeof QUALITY_SAMPLE_STATUSES)[number];

export const QUALITY_SAMPLE_STATUS_LABELS: Record<
  QualitySampleStatus,
  string
> = {
  planned: "Planlandı",
  collected: "Numune Alındı",
  under_review: "İnceleniyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  cancelled: "İptal Edildi",
};

export interface QualitySample {
  readonly id: string;
  readonly tenantId: string;
  readonly inspectionId: string;
  readonly inspectionItemId?: string;
  readonly sampleNumber: string;
  readonly quantity: number;
  readonly unit: string;
  readonly status: QualitySampleStatus;
  readonly lotNumber?: string;
  readonly serialNumber?: string;
  readonly collectedBy?: string;
  readonly collectedAt?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateQualitySampleInput {
  tenantId: string;
  inspectionId: string;
  inspectionItemId?: string;
  quantity: number;
  unit: string;
  lotNumber?: string;
  serialNumber?: string;
  notes?: string;
  createdBy: string;
}

export function isQualitySampleStatus(
  value: unknown,
): value is QualitySampleStatus {
  return (
    typeof value === "string" &&
    QUALITY_SAMPLE_STATUSES.includes(
      value as QualitySampleStatus,
    )
  );
}
