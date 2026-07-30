import type { SupabaseClient } from '@supabase/supabase-js';

export type UploadableBusinessDocumentType =
  | 'xlsx'
  | 'xls'
  | 'csv'
  | 'pdf'
  | 'docx'
  | 'pptx';

export interface UploadBusinessDocumentInput {
  businessId: string;
  projectId?: string;
  userId: string;
  file: File;
}

export interface UploadedBusinessDocument {
  id: string;
  businessId: string;
  projectId: string | null;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  documentType: UploadableBusinessDocumentType;
  status: string;
  createdAt: string;
}

interface BusinessDocumentRow {
  id: string;
  business_id: string;
  project_id: string | null;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path: string;
  document_type: UploadableBusinessDocumentType;
  status: string;
  created_at: string;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const STORAGE_BUCKET = 'business-documents';

const EXTENSION_TO_TYPE: Readonly<
  Record<string, UploadableBusinessDocumentType>
> = {
  xlsx: 'xlsx',
  xls: 'xls',
  csv: 'csv',
  pdf: 'pdf',
  docx: 'docx',
  pptx: 'pptx'
};

function resolveDocumentType(
  fileName: string
): UploadableBusinessDocumentType {
  const extension = fileName
    .split('.')
    .pop()
    ?.trim()
    .toLocaleLowerCase('tr-TR');

  if (!extension || !(extension in EXTENSION_TO_TYPE)) {
    throw new Error(
      'Desteklenmeyen dosya biçimi. PDF, CSV, XLS, XLSX, DOCX veya PPTX yükleyin.'
    );
  }

  return EXTENSION_TO_TYPE[extension];
}

function sanitizeFileName(fileName: string): string {
  const extension = fileName
    .split('.')
    .pop()
    ?.toLocaleLowerCase('tr-TR');

  const baseName = fileName
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

  const safeBaseName = baseName || 'belge';

  return extension
    ? `${safeBaseName}.${extension}`
    : safeBaseName;
}

function createStoragePath(
  businessId: string,
  projectId: string | undefined,
  fileName: string
): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const documentId = crypto.randomUUID();

  return [
    businessId,
    projectId ?? 'genel',
    year,
    month,
    `${documentId}-${sanitizeFileName(fileName)}`
  ].join('/');
}

function resolveMimeType(
  file: File,
  documentType: UploadableBusinessDocumentType
): string {
  if (file.type) return file.type;

  const fallbackMimeTypes: Record<
    UploadableBusinessDocumentType,
    string
  > = {
    pdf: 'application/pdf',
    csv: 'text/csv',
    xls: 'application/vnd.ms-excel',
    xlsx:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    docx:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };

  return fallbackMimeTypes[documentType];
}

export class SupabaseBusinessDocumentUploadProvider {
  constructor(private readonly client: SupabaseClient) {}

  async uploadDocument(
    input: UploadBusinessDocumentInput
  ): Promise<UploadedBusinessDocument> {
    if (!input.file.name.trim()) {
      throw new Error('Dosya adı geçersiz.');
    }

    if (input.file.size <= 0) {
      throw new Error('Boş dosya yüklenemez.');
    }

    if (input.file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('Dosya boyutu en fazla 50 MB olabilir.');
    }

    const documentType = resolveDocumentType(input.file.name);
    const mimeType = resolveMimeType(input.file, documentType);
    const storagePath = createStoragePath(
      input.businessId,
      input.projectId,
      input.file.name
    );

    const { error: uploadError } = await this.client.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, input.file, {
        cacheControl: '3600',
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      throw new Error(
        `Dosya yüklenemedi: ${uploadError.message}`
      );
    }

    const metadataId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const { error: metadataError } = await this.client
      .from('business_documents')
      .insert({
        id: metadataId,
        business_id: input.businessId,
        project_id: input.projectId ?? null,
        uploaded_by: input.userId,
        file_name: input.file.name,
        mime_type: mimeType,
        file_size_bytes: input.file.size,
        storage_path: storagePath,
        document_type: documentType,
        status: 'uploaded',
        created_at: createdAt,
        updated_at: createdAt
      });

    if (metadataError) {
      await this.client.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);

      throw new Error(
        `Dosya kaydı oluşturulamadı: ${metadataError.message}`
      );
    }

    return {
      id: metadataId,
      businessId: input.businessId,
      projectId: input.projectId ?? null,
      fileName: input.file.name,
      mimeType,
      fileSizeBytes: input.file.size,
      storagePath,
      documentType,
      status: 'uploaded',
      createdAt
    };
  }

  async listDocuments(
    businessId: string,
    limit = 20
  ): Promise<readonly UploadedBusinessDocument[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));

    const { data, error } = await this.client
      .from('business_documents')
      .select(
        [
          'id',
          'business_id',
          'project_id',
          'file_name',
          'mime_type',
          'file_size_bytes',
          'storage_path',
          'document_type',
          'status',
          'created_at'
        ].join(',')
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw new Error(
        `Yüklenen dosyalar alınamadı: ${error.message}`
      );
    }

    return Object.freeze(
      ((data ?? []) as unknown as BusinessDocumentRow[]).map((row) => ({
        id: row.id,
        businessId: row.business_id,
        projectId: row.project_id,
        fileName: row.file_name,
        mimeType: row.mime_type,
        fileSizeBytes: row.file_size_bytes,
        storagePath: row.storage_path,
        documentType: row.document_type,
        status: row.status,
        createdAt: row.created_at
      }))
    );
  }
}
