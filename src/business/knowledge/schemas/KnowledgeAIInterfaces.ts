/**
 * İSTEBUL Business — gelecek AI entegrasyonu için arayüz hazırlığı.
 *
 * Bu dosya yalnızca interface tanımlar.
 * AI çağrısı, proxy erişimi veya model istemcisi içermez.
 * Auth / Billing / AI Core paketlerine bağımlılık yoktur.
 */

import type { OutputFormatId } from '../outputs/OutputDefinition';
import type { PromptKey } from '../prompts/PromptDefinition';
import type { ReportDefinition } from '../reports/ReportDefinition';

/**
 * Analiz isteğine eklenecek girdi veri parçası.
 */
export interface KnowledgeAnalysisDataRef {
  /** Veri tipi anahtarı (Report DNA `requiredDataTypes` ile uyumlu) */
  dataType: string;
  /** Kaynak etiketı — örn. yüklenen dosya adı */
  sourceLabel?: string;
  /** Ham veya özetlenmiş yük (şekli sonraki PR’larda daraltılır) */
  payload?: unknown;
}

/**
 * Knowledge katmanından AI analiz motoruna gidecek istek sözleşmesi.
 * Henüz hiçbir yerde çağrılmaz.
 */
export interface KnowledgeAnalysisRequest {
  /** Rapor kimliği — ReportRegistry */
  reportId: string;
  /** Prompt anahtarı — PromptRegistry */
  promptKey: PromptKey;
  /** İstenen çıktı formatları */
  requestedOutputs: readonly OutputFormatId[];
  /** Analiz girdileri */
  dataRefs: readonly KnowledgeAnalysisDataRef[];
  /** İstek dili — varsayılan `tr` */
  locale?: 'tr' | 'en';
}

/**
 * AI motorundan knowledge katmanına dönecek özet sonuç sözleşmesi.
 * Henüz hiçbir yerde üretilmez.
 */
export interface KnowledgeAnalysisResult {
  /** Rapor kimliği */
  reportId: string;
  /** Kullanılan prompt anahtarı */
  promptKey: PromptKey;
  /** Kısa yönetici özeti (Türkçe beklenir) */
  summary: string;
  /** Varsa yapılandırılmış bulgular */
  findings?: readonly string[];
  /** Varsa öneriler */
  recommendations?: readonly string[];
  /** Üretilmesi önerilen çıktılar */
  suggestedOutputs?: readonly OutputFormatId[];
  /** Motor sürüm / izlenebilirlik etiketi */
  engineLabel?: string;
}

/**
 * Report DNA + prompt anahtarını AI katmanına bağlayan port.
 * Uygulama (implementasyon) sonraki PR’lardadır.
 */
export interface BusinessKnowledgeAIPort {
  /**
   * Verilen isteğe göre analiz sonucu üretir.
   * Bu PR’da implementasyon yoktur.
   */
  analyze(request: KnowledgeAnalysisRequest): Promise<KnowledgeAnalysisResult>;

  /**
   * Rapor tanımından varsayılan analiz isteği iskeleti üretir.
   * Bu PR’da implementasyon yoktur.
   */
  buildRequestFromReport?(
    report: ReportDefinition,
    dataRefs: readonly KnowledgeAnalysisDataRef[]
  ): KnowledgeAnalysisRequest;
}
