export const QUALITY_DOCUMENT_TYPES = [
  "inspection_report",
  "laboratory_report",
  "certificate_of_analysis",
  "supplier_certificate",
  "photo",
  "other",
] as const;

export type QualityDocumentType =
  (typeof QUALITY_DOCUMENT_TYPES)[number];

export const QUALITY_DOCUMENT_TYPE_LABELS: Record<
  QualityDocumentType,
  string
> = {
  inspection_report: "Kontrol Raporu",
  laboratory_report: "Laboratuvar Raporu",
  certificate_of_analysis: "Analiz Sertifikası",
  supplier_certificate: "Tedarikçi Sertifikası",
  photo: "Fotoğraf",
  other: "Diğer Belge",
};

export interface QualityDocument {
  readonly id: string;
  readonly tenantId: string;
  readonly inspectionId: string;
  readonly inspectionItemId?: string;
  readonly type: QualityDocumentType;
  readonly documentNumber?: string;
  readonly documentDate?: string;
  readonly fileName?: string;
  readonly fileUrl?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface CreateQualityDocumentInput {
  tenantId: string;
  inspectionId: string;
  inspectionItemId?: string;
  type: QualityDocumentType;
  documentNumber?: string;
  documentDate?: string;
  fileName?: string;
  fileUrl?: string;
  notes?: string;
  createdBy: string;
}

export function isQualityDocumentType(
  value: unknown,
): value is QualityDocumentType {
  return (
    typeof value === "string" &&
    QUALITY_DOCUMENT_TYPES.includes(
      value as QualityDocumentType,
    )
  );
}
