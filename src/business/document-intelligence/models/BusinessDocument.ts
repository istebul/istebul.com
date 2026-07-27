export type BusinessDocumentFormat =
  | 'xlsx'
  | 'csv'
  | 'pdf'
  | 'docx'
  | 'pptx';

export type BusinessDocumentStatus =
  | 'uploaded'
  | 'parsing'
  | 'ready'
  | 'failed';

export interface BusinessDocument {
  id: string;
  businessId: string;
  projectId: string;
  fileName: string;
  format: BusinessDocumentFormat;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  status: BusinessDocumentStatus;
  uploadedAt: string;
}
