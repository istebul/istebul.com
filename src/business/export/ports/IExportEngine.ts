import type { ExportContext } from '../models/ExportContext';
import type { ExportRequest } from '../models/ExportRequest';
import type { ExportResult } from '../models/ExportResult';

export interface IExportEngine {
  /**
   * Document / Dashboard modellerinden ExportResult üretir.
   * Bu PR’da implementasyon yoktur.
   */
  export(
    request: ExportRequest,
    context: ExportContext
  ): Promise<ExportResult>;
}
