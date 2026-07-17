import type { OutputFormatId } from '../../knowledge/outputs/OutputDefinition';
import type { ExportContext } from '../models/ExportContext';
import type { ExportTemplate } from '../models/ExportTemplate';

export interface ITemplateResolver {
  resolve(
    context: ExportContext,
    options: Readonly<{
      templateId?: string;
      formatId: OutputFormatId;
      reportDnaId?: string;
    }>
  ): Promise<ExportTemplate | undefined>;
}
