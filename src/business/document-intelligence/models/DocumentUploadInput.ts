import type { BusinessDocumentFormat } from './BusinessDocument';

export interface DocumentUploadInput {
  businessId: string;
  projectId: string;
  userId: string;
  fileName: string;
  format: BusinessDocumentFormat;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}
