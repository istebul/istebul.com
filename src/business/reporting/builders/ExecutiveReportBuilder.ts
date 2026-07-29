import type { BusinessAnalysisResult } from '../../document-intelligence/models/BusinessAnalysisResult';
import type { ExecutiveReport } from '../models/ExecutiveReport';

export class ExecutiveReportBuilder {
  build(
    analysis: BusinessAnalysisResult,
    businessName: string,
    documentName: string
  ): ExecutiveReport {

    return {
      title: 'Executive Business Report',
      businessName,
      documentName,
      generatedAt: new Date(),

      score: analysis.score,
      summary: analysis.summary,

      kpis: analysis.kpis,
      insights: analysis.insights,
      recommendations: analysis.recommendations,

      sections: [
        {
          title: 'Yönetici Özeti',
          content: [analysis.summary]
        },
        {
          title: 'Öneriler',
          content: analysis.recommendations
        }
      ]
    };
  }
}
