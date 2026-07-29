import type { BusinessAnalysisResult } from '../../document-intelligence/models/BusinessAnalysisResult';
import { ExecutiveReportBuilder } from '../builders/ExecutiveReportBuilder';

export class BusinessReportService {

  private readonly builder =
    new ExecutiveReportBuilder();

  buildExecutiveReport(
    analysis: BusinessAnalysisResult,
    businessName: string,
    documentName: string
  ) {
    return this.builder.build(
      analysis,
      businessName,
      documentName
    );
  }
}
