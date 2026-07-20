/**
 * Builtin Narrative şablonları (PR-104C) — şablon tabanlı; AI yok.
 */

import type { NarrativeTemplate } from './NarrativeTemplate';

export const BUILTIN_NARRATIVE_TEMPLATES: readonly NarrativeTemplate[] =
  Object.freeze([
    Object.freeze({
      id: 'narrative-executive-summary',
      kind: 'executive-summary' as const,
      title: 'Yönetici Özeti',
      bodyTemplate:
        'Karar durumu {{decisionStatus}}; {{recommendationCount}} öneri ve {{actionCount}} aksiyon raporlandı. Dataset: {{datasetId}}.',
      highlightTemplates: Object.freeze([
        'Öneri sayısı: {{recommendationCount}}',
        'Aksiyon sayısı: {{actionCount}}',
        'Karar özeti: {{summaryHeadline}}'
      ]),
      locale: 'tr' as const,
      order: 1,
      enabled: true
    }),
    Object.freeze({
      id: 'narrative-policy-overview',
      kind: 'policy-overview' as const,
      title: 'Politika Özeti',
      bodyTemplate:
        'Politika görünümü: {{riskCount}} risk, {{opportunityCount}} fırsat, {{priorityCount}} öncelik kaydı.',
      highlightTemplates: Object.freeze([
        'Risk: {{riskCount}}',
        'Fırsat: {{opportunityCount}}',
        'Öncelik: {{priorityCount}}'
      ]),
      locale: 'tr' as const,
      order: 2,
      enabled: true
    }),
    Object.freeze({
      id: 'narrative-recommendation-overview',
      kind: 'recommendation-overview' as const,
      title: 'Öneri Özeti',
      bodyTemplate:
        'Toplam {{recommendationCount}} öneri üretildi. Öncelik dağılımı — kritik: {{priorityKritik}}, yüksek: {{priorityYuksek}}, orta: {{priorityOrta}}, düşük: {{priorityDusuk}}. Başlıklar: {{recommendationTitles}}.',
      highlightTemplates: Object.freeze([
        'Öneri sayısı: {{recommendationCount}}',
        'İlk öneri: {{firstRecommendationTitle}}'
      ]),
      locale: 'tr' as const,
      order: 3,
      enabled: true
    }),
    Object.freeze({
      id: 'narrative-action-plan-overview',
      kind: 'action-plan-overview' as const,
      title: 'Aksiyon Planı Özeti',
      bodyTemplate:
        'Toplam {{actionCount}} aksiyon adımı planlandı. Türler — incele: {{kindIncele}}, iyileştir: {{kindIyilestir}}, izle: {{kindIzle}}. Başlıklar: {{actionTitles}}.',
      highlightTemplates: Object.freeze([
        'Aksiyon sayısı: {{actionCount}}',
        'İlk aksiyon: {{firstActionTitle}}'
      ]),
      locale: 'tr' as const,
      order: 4,
      enabled: true
    }),
    Object.freeze({
      id: 'narrative-dataset-overview',
      kind: 'dataset-overview' as const,
      title: 'Dataset Özeti',
      bodyTemplate:
        'Dataset {{datasetId}} (analiz: {{analysisRequestId}}) rapor modeline bağlandı. Mevcut: {{datasetPresent}}.',
      highlightTemplates: Object.freeze([
        'Dataset ID: {{datasetId}}',
        'Analiz isteği: {{analysisRequestId}}'
      ]),
      locale: 'tr' as const,
      order: 5,
      enabled: true
    })
  ]);

export const BUILTIN_NARRATIVE_TEMPLATE_COUNT =
  BUILTIN_NARRATIVE_TEMPLATES.length;

export function getBuiltinNarrativeTemplate(
  id: string
): NarrativeTemplate | undefined {
  return BUILTIN_NARRATIVE_TEMPLATES.find((item) => item.id === id);
}

export function getBuiltinNarrativeTemplateByKind(
  kind: NarrativeTemplate['kind']
): NarrativeTemplate | undefined {
  return BUILTIN_NARRATIVE_TEMPLATES.find((item) => item.kind === kind);
}
