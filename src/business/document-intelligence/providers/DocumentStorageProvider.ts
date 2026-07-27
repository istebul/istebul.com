import type { BusinessDocument } from '../models/BusinessDocument';
import type { DocumentUploadInput } from '../models/DocumentUploadInput';

export interface DocumentStorageProvider {
  saveMetadata(input: DocumentUploadInput): Promise<BusinessDocument>;
  listByProject(projectId: string): Promise<BusinessDocument[]>;
}
