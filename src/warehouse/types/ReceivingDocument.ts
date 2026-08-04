export const RECEIVING_DOCUMENT_TYPES = [
  "purchase_order",
  "advance_shipping_notice",
  "delivery_note",
  "invoice",
  "transfer_order",
  "return_document",
  "quality_document",
  "other",
] as const;

export type ReceivingDocumentType =
  (typeof RECEIVING_DOCUMENT_TYPES)[number];

export const RECEIVING_DOCUMENT_TYPE_LABELS: Record<
  ReceivingDocumentType,
  string
> = {
  purchase_order: "Satın Alma Siparişi",
  advance_shipping_notice: "Ön Sevkiyat Bildirimi",
  delivery_note: "İrsaliye",
  invoice: "Fatura",
  transfer_order: "Transfer Emri",
  return_document: "İade Belgesi",
  quality_document: "Kalite Belgesi",
  other: "Diğer Belge",
};

export interface ReceivingDocument {
  readonly id: string;
  readonly tenantId: string;
  readonly receivingId: string;
  readonly type: ReceivingDocumentType;
  readonly documentNumber: string;
  readonly documentDate?: string;
  readonly externalSystem?: string;
  readonly externalId?: string;
  readonly fileName?: string;
  readonly fileUrl?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface CreateReceivingDocumentInput {
  tenantId: string;
  receivingId: string;
  type: ReceivingDocumentType;
  documentNumber: string;
  documentDate?: string;
  externalSystem?: string;
  externalId?: string;
  fileName?: string;
  fileUrl?: string;
  notes?: string;
  createdBy: string;
}

export function isReceivingDocumentType(
  value: unknown,
): value is ReceivingDocumentType {
  return (
    typeof value === "string" &&
    RECEIVING_DOCUMENT_TYPES.includes(
      value as ReceivingDocumentType,
    )
  );
}
