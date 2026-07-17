import type { ExportArtifact } from '../models/ExportArtifact';
import type { ExportContext } from '../models/ExportContext';
import type { ExportFormat } from '../models/ExportFormat';
import type { ExportTemplate } from '../models/ExportTemplate';

export interface IArtifactBuilder {
  /**
   * Format + şablon + kaynak modellerden artifact tanımları üretir.
   * Gerçek PDF/DOCX bayt üretimi yoktur.
   */
  build(
    context: ExportContext,
    formats: readonly ExportFormat[],
    templates: readonly ExportTemplate[]
  ): Promise<readonly ExportArtifact[]>;
}
