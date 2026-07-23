import type { OutputFormatId } from '../../knowledge/outputs/OutputDefinition';
import type { ExportContext } from '../models/ExportContext';
import type { ExportFormat } from '../models/ExportFormat';

export interface IFormatResolver {
  resolve(
    context: ExportContext,
    formatIds: readonly OutputFormatId[]
  ): Promise<readonly ExportFormat[]>;
}
