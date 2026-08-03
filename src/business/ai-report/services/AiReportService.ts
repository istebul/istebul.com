import type {
  AiReport,
  AiReportSection,
  GenerateAiReportInput
} from '../models/AiReport';
import type { AiTextProvider } from '../providers/AiTextProvider';
import { buildAiReportPrompt } from '../prompts/buildAiReportPrompt';

type ParsedAiReport = Omit<AiReport, 'generatedAt'>;

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string')
  );
}

function isReportSection(value: unknown): value is AiReportSection {
  if (!value || typeof value !== 'object') return false;

  const section = value as Record<string, unknown>;

  return (
    typeof section.id === 'string' &&
    typeof section.title === 'string' &&
    typeof section.content === 'string' &&
    isStringArray(section.highlights)
  );
}

function parseReport(
  raw: string,
  input: GenerateAiReportInput
): ParsedAiReport {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AI rapor çıktısı geçerli JSON değil.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI rapor çıktısı nesne biçiminde değil.');
  }

  const report = parsed as Record<string, unknown>;

  if (
    typeof report.title !== 'string' ||
    typeof report.executiveSummary !== 'string' ||
    !Array.isArray(report.sections) ||
    !report.sections.every(isReportSection) ||
    !isStringArray(report.recommendations) ||
    !isStringArray(report.risks)
  ) {
    throw new Error('AI rapor çıktısı beklenen şemayla uyumlu değil.');
  }

  return {
    title: report.title,
    reportType: input.reportType,
    executiveSummary: report.executiveSummary,
    sections: report.sections,
    recommendations: report.recommendations,
    risks: report.risks
  };
}

export class AiReportService {
  private readonly provider: AiTextProvider;

  constructor(provider: AiTextProvider) {
    this.provider = provider;
  }

  async generate(
    input: GenerateAiReportInput
  ): Promise<AiReport> {
    const prompt = buildAiReportPrompt(input);
    const raw = await this.provider.generateText(prompt);
    const report = parseReport(raw, input);

    return {
      ...report,
      generatedAt: new Date().toISOString()
    };
  }
}
