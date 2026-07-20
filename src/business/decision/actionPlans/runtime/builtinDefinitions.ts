/**
 * İSTEBUL Business Decision Engine — yerleşik Action Plan tanımları (PR-103D).
 */

import type { ActionPlanDefinition } from './ActionPlanDefinition';

export const BUILTIN_ACTION_PLAN_DEFINITIONS: readonly ActionPlanDefinition[] =
  Object.freeze([
    Object.freeze({
      id: 'plan-minimum-data-quality-score',
      code: 'PLAN_MINIMUM_DATA_QUALITY_SCORE',
      title: 'Data Quality Improvement Plan',
      description:
        'Veri kalitesi skorunu yükseltmek için uygulanabilir adımlar.',
      defaultPriority: 'orta' as const,
      estimatedImpact: 70,
      estimatedEffort: 40,
      stepTemplates: Object.freeze([
        Object.freeze({
          order: 1,
          title: 'Boş alanları incele',
          description: 'Boş ve null alan oranlarını raporlayın.',
          kind: 'incele' as const
        }),
        Object.freeze({
          order: 2,
          title: 'Doldurma kurallarını iyileştir',
          description: 'Zorunlu alan doğrulama ve varsayılan değerleri gözden geçirin.',
          kind: 'iyilestir' as const
        }),
        Object.freeze({
          order: 3,
          title: 'Kalite skorunu izle',
          description: 'Düzeltme sonrası filled-value-ratio ve kalite skorunu takip edin.',
          kind: 'izle' as const
        })
      ]),
      sourceRecommendationId: 'rec-minimum-data-quality-score',
      order: 1,
      enabled: true
    }),
    Object.freeze({
      id: 'plan-critical-finding-present',
      code: 'PLAN_CRITICAL_FINDING_PRESENT',
      title: 'Critical Finding Remediation Plan',
      description: 'Kritik bulgular için öncelikli müdahale adımları.',
      defaultPriority: 'kritik' as const,
      estimatedImpact: 95,
      estimatedEffort: 60,
      stepTemplates: Object.freeze([
        Object.freeze({
          order: 1,
          title: 'Kritik bulguları incele',
          description: 'Tüm kritik bulguları listeleyin ve sahiplik atayın.',
          kind: 'incele' as const
        }),
        Object.freeze({
          order: 2,
          title: 'Eskalasyon başlat',
          description: 'Kritik bulgular için ilgili ekiplere eskalasyon yapın.',
          kind: 'eskalasyon' as const
        }),
        Object.freeze({
          order: 3,
          title: 'Düzeltmeyi onayla',
          description: 'Giderilen bulguların kapanışını onaylayın.',
          kind: 'onayla' as const
        })
      ]),
      sourceRecommendationId: 'rec-critical-finding-present',
      order: 2,
      enabled: true
    }),
    Object.freeze({
      id: 'plan-error-rule-present',
      code: 'PLAN_ERROR_RULE_PRESENT',
      title: 'Error Rule Resolution Plan',
      description: 'Kural kaynaklı hata bulgularını çözmek için adımlar.',
      defaultPriority: 'yuksek' as const,
      estimatedImpact: 80,
      estimatedEffort: 50,
      stepTemplates: Object.freeze([
        Object.freeze({
          order: 1,
          title: 'Hata kurallarını incele',
          description: 'ruleId bağlı kritik/hata bulgularını ayıklayın.',
          kind: 'incele' as const
        }),
        Object.freeze({
          order: 2,
          title: 'Veri/kural düzeltmesi uygula',
          description: 'İlgili veri alanlarını veya kural eşiklerini düzeltin.',
          kind: 'iyilestir' as const
        }),
        Object.freeze({
          order: 3,
          title: 'Yeniden değerlendir',
          description: 'Policy/Rule yeniden çalıştırılarak sonucu doğrulayın.',
          kind: 'izle' as const
        })
      ]),
      sourceRecommendationId: 'rec-error-rule-present',
      order: 3,
      enabled: true
    }),
    Object.freeze({
      id: 'plan-minimum-dataset-size',
      code: 'PLAN_MINIMUM_DATASET_SIZE',
      title: 'Dataset Coverage Expansion Plan',
      description: 'Dataset boyutunu minimum eşiğin üzerine çıkarma adımları.',
      defaultPriority: 'yuksek' as const,
      estimatedImpact: 75,
      estimatedEffort: 55,
      stepTemplates: Object.freeze([
        Object.freeze({
          order: 1,
          title: 'Eksik entity/satırları incele',
          description: 'statistics.entityCount ve rowCount açıklarını belirleyin.',
          kind: 'incele' as const
        }),
        Object.freeze({
          order: 2,
          title: 'Veri kaynağını genişlet',
          description: 'Eksik kayıtları tamamlayacak kaynakları bağlayın.',
          kind: 'iyilestir' as const
        }),
        Object.freeze({
          order: 3,
          title: 'Kapsamı izle',
          description: 'Yeniden import sonrası boyutu doğrulayın.',
          kind: 'izle' as const
        })
      ]),
      sourceRecommendationId: 'rec-minimum-dataset-size',
      order: 4,
      enabled: true
    }),
    Object.freeze({
      id: 'plan-required-metadata-available',
      code: 'PLAN_REQUIRED_METADATA_AVAILABLE',
      title: 'Metadata Completion Plan',
      description: 'Zorunlu AnalysisResult metadata alanlarını tamamlama adımları.',
      defaultPriority: 'yuksek' as const,
      estimatedImpact: 65,
      estimatedEffort: 25,
      stepTemplates: Object.freeze([
        Object.freeze({
          order: 1,
          title: 'Eksik metadata alanlarını incele',
          description: 'requestId, datasetId, statistics, completedAt kontrol edin.',
          kind: 'incele' as const
        }),
        Object.freeze({
          order: 2,
          title: 'Metadata’yı tamamla',
          description: 'Eksik alanları pipeline/export katmanında doldurun.',
          kind: 'iyilestir' as const
        }),
        Object.freeze({
          order: 3,
          title: 'Doğrulamayı tekrarla',
          description: 'Decision Validation’ı yeniden çalıştırın.',
          kind: 'onayla' as const
        })
      ]),
      sourceRecommendationId: 'rec-required-metadata-available',
      order: 5,
      enabled: true
    })
  ]);

export const BUILTIN_ACTION_PLAN_DEFINITION_COUNT =
  BUILTIN_ACTION_PLAN_DEFINITIONS.length;

export function getBuiltinActionPlanDefinition(
  id: string
): ActionPlanDefinition | undefined {
  return BUILTIN_ACTION_PLAN_DEFINITIONS.find((item) => item.id === id);
}

export function getBuiltinActionPlanDefinitionByRecommendationId(
  recommendationId: string
): ActionPlanDefinition | undefined {
  return BUILTIN_ACTION_PLAN_DEFINITIONS.find(
    (item) => item.sourceRecommendationId === recommendationId
  );
}
