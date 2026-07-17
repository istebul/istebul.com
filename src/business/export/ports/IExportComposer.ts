import type { ExportArtifact } from '../models/ExportArtifact';
import type { ExportContext } from '../models/ExportContext';
import type { ExportFormat } from '../models/ExportFormat';
import type { ExportMetadata } from '../models/ExportMetadata';
import type { ExportResult } from '../models/ExportResult';
import type { ExportSummary } from '../models/ExportSummary';
import type { ExportTemplate } from '../models/ExportTemplate';

export interface IExportComposer {
  compose(
    context: ExportContext,
    parts: Readonly<{
      metadata: ExportMetadata;
      formats: readonly ExportFormat[];
      templates: readonly ExportTemplate[];
      artifacts: readonly ExportArtifact[];
      summary: ExportSummary;
    }>
  ): Promise<ExportResult>;
}
