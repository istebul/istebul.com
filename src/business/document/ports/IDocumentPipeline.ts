import type { DocumentPipelineStageDefinition } from '../pipeline/DocumentPipeline';
import type { DocumentModel } from '../models/DocumentModel';
import type { DocumentRequest } from '../models/DocumentRequest';

export interface IDocumentPipeline {
  readonly stages: readonly DocumentPipelineStageDefinition[];

  /**
   * İsteği doküman pipeline aşamalarından geçirir.
   * Implementasyon sonraki PR’lardadır.
   */
  run(request: DocumentRequest): Promise<DocumentModel>;
}
