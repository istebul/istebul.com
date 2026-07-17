import type { ReportModel } from '../../report/models/ReportModel';
import type { DocumentContext } from '../models/DocumentContext';
import type { DocumentLayout } from '../models/DocumentLayout';

export interface ILayoutBuilder {
  build(
    context: DocumentContext,
    reportModel: ReportModel,
    layoutId: string
  ): Promise<DocumentLayout>;
}
