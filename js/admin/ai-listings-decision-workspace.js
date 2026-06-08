/**
 * AI Listings Decision Workspace — center panel builder (Sprint-28).
 */

import { escapeHtml } from '../core/dom-safe.js';
import {
  formatCategoryLabel,
  formatStatusLabel,
  formatAdminMetricLabel,
  formatRiskLevelLabel,
  formatLoadingLabel,
  formatErrorFallbackLabel,
  translateAdminUiError
} from './ai-listings-admin-labels.js';
import { buildScenarioTeaserHtml } from '../ai-scenario-simulator/scenario-card-builder.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {'completed'|'partial'|'missing'} status
 * @returns {string}
 */
function pipelineStatusClass(status) {
  if (status === 'completed') return 'ai-ws-pipeline__step--completed';
  if (status === 'partial') return 'ai-ws-pipeline__step--partial';
  return 'ai-ws-pipeline__step--missing';
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {Array<Record<string, unknown>>}
 */
export function buildDecisionPipeline(ctx) {
  const hasListing = Boolean(ctx.listing?.id);
  const quality = Number(ctx.qualityScore);
  const trust = Number(ctx.trustScore);
  const hasCost = Boolean(ctx.hasOwnershipCost);
  const hasNegotiation = Boolean(ctx.hasNegotiation);
  const hasPd = Number(ctx.decisionScore) > 0;
  const hasExp = Number(ctx.explanationScore) > 0;
  const hasReport = Number(ctx.reportScore) > 0;
  const hasCompare = Boolean(ctx.hasCompare);
  const dataCompleteness = Number(ctx.dataCompleteness);
  const entityConfidence = Number(ctx.entityConfidence);
  const hasLearning = Number(ctx.learningEventCount) > 0;
  const hasPersonalization = Boolean(ctx.hasPersonalization);

  return [
    { id: 'listing', label: 'İlan', status: hasListing ? 'completed' : 'missing', note: hasListing ? 'İlan verisi mevcut' : 'Eksik veri' },
    { id: 'data_pool', label: 'Veri havuzu', status: dataCompleteness >= 60 ? 'completed' : dataCompleteness > 0 ? 'partial' : 'missing', note: dataCompleteness > 0 ? `Veri tamlığı: ${dataCompleteness}%` : 'Eksik veri' },
    { id: 'entity', label: 'Varlık çözümleme', status: entityConfidence >= 60 ? 'completed' : entityConfidence > 0 ? 'partial' : 'missing', note: entityConfidence > 0 ? `Varlık güveni: ${entityConfidence}%` : 'Eksik veri' },
    { id: 'quality', label: 'Kalite', status: quality >= 60 ? 'completed' : quality > 0 ? 'partial' : 'missing', note: quality > 0 ? `Kalite skoru: ${quality}` : 'Eksik veri' },
    { id: 'trust', label: 'Güven', status: trust >= 60 ? 'completed' : trust > 0 ? 'partial' : 'missing', note: trust > 0 ? `Güven skoru: ${trust}` : 'Eksik veri' },
    { id: 'cost', label: 'Toplam maliyet', status: hasCost ? 'completed' : 'missing', note: hasCost ? 'Maliyet simülasyonu mevcut' : 'Eksik veri' },
    { id: 'negotiation', label: 'Pazarlık', status: hasNegotiation ? 'completed' : 'partial', note: hasNegotiation ? 'Pazarlık sinyali mevcut' : 'Eksik veri' },
    { id: 'purchase', label: 'Al kararı', status: hasPd ? 'completed' : 'missing', note: hasPd ? `Karar skoru: ${ctx.decisionScore}` : 'Eksik veri' },
    { id: 'explain', label: 'Açıklama', status: hasExp ? 'completed' : 'partial', note: hasExp ? `Açıklama skoru: ${ctx.explanationScore}` : 'Eksik veri' },
    { id: 'personalization', label: 'Kişiselleştirme', status: hasPersonalization ? 'completed' : hasPd ? 'partial' : 'missing', note: hasPersonalization ? 'Tercih profili aktif' : 'Tercih profili bekleniyor' },
    { id: 'report', label: 'Yönetici raporu', status: hasReport ? 'completed' : 'partial', note: hasReport ? `Rapor skoru: ${ctx.reportScore}` : 'Eksik veri' },
    { id: 'compare', label: 'Karşılaştırma', status: hasCompare ? 'completed' : 'partial', note: hasCompare ? 'Karşılaştırma hazır' : 'En az 2 öneri gerekir' },
    { id: 'learning', label: 'Öğrenme', status: hasLearning ? 'completed' : 'partial', note: hasLearning ? `${ctx.learningEventCount} etkileşim` : 'Kullanım verisi toplanıyor' }
  ];
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {{ strong: string[], weak: string[], risky: string[] }}
 */
export function buildHeatMapSignals(ctx) {
  /** @type {string[]} */
  const strong = [];
  /** @type {string[]} */
  const weak = [];
  /** @type {string[]} */
  const risky = [];

  if (Number(ctx.decisionScore) >= 70) strong.push(`Karar skoru güçlü (${ctx.decisionScore})`);
  if (Number(ctx.qualityScore) >= 70) strong.push(`Kalite skoru yüksek (${ctx.qualityScore})`);
  if (Number(ctx.trustScore) >= 70) strong.push(`Güven skoru yüksek (${ctx.trustScore})`);
  if (Number(ctx.explanationScore) >= 70) strong.push(`Açıklama net (${ctx.explanationScore})`);

  if (Number(ctx.qualityScore) > 0 && Number(ctx.qualityScore) < 50) weak.push(`Kalite skoru düşük (${ctx.qualityScore})`);
  if (!ctx.hasOwnershipCost) weak.push('Toplam maliyet verisi eksik');
  if (!ctx.hasNegotiation) weak.push('Pazarlık sinyali sınırlı');

  if (Number(ctx.riskScore) >= 60) risky.push(`Risk skoru yüksek (${ctx.riskScore})`);
  if (ctx.duplicateLabel) risky.push(safe(String(ctx.duplicateLabel)));
  if (ctx.missingCount > 0) risky.push(`${ctx.missingCount} kritik bilgi eksik`);

  return {
    strong: strong.slice(0, 3),
    weak: weak.slice(0, 3),
    risky: risky.slice(0, 3)
  };
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {Array<Record<string, unknown>>}
 */
const INSUFFICIENT_DATA_HINT = 'Bu analiz için yeterli veri yok.';

/**
 * @param {Record<string, unknown>} ctx
 * @returns {Array<Record<string, unknown>>}
 */
export function buildActionCenterActions(ctx) {
  const hasRec = Boolean(ctx.recommendation?.id);
  const noRecHint = 'Henüz öneri oluşturulmadı.';
  return [
    { key: 'purchase', label: 'Al Kararı', enabled: hasRec, hint: hasRec ? '' : noRecHint },
    { key: 'explain', label: 'Neden Bu Karar?', enabled: hasRec, hint: hasRec ? '' : noRecHint },
    { key: 'report', label: 'Yönetici Raporu', enabled: hasRec, hint: hasRec ? '' : noRecHint },
    {
      key: 'compare',
      label: 'Karşılaştır',
      enabled: Boolean(ctx.hasCompare),
      hint: ctx.hasCompare ? '' : 'Karşılaştırma için en az iki öneri seçin.'
    },
    { key: 'scenario', label: 'Senaryo Simülasyonu', enabled: hasRec, hint: hasRec ? '' : noRecHint },
    {
      key: 'negotiation',
      label: 'Pazarlık Analizi',
      enabled: hasRec && ctx.hasNegotiation,
      hint: INSUFFICIENT_DATA_HINT
    },
    {
      key: 'quality',
      label: 'Kalite ve Güven',
      enabled: hasRec && Number(ctx.qualityScore) > 0,
      hint: INSUFFICIENT_DATA_HINT
    },
    {
      key: 'learning',
      label: 'Öğrenme Öngörüleri',
      enabled: Boolean(ctx.listing?.id),
      hint: 'İlan seçildiğinde öğrenme paneli açılır.'
    },
    {
      key: 'preferences',
      label: 'Tercih Profili',
      enabled: Boolean(ctx.hasPersonalization) || hasRec,
      hint: hasRec ? '' : noRecHint
    },
    {
      key: 'data_pool',
      label: 'Veri Havuzu',
      enabled: Boolean(ctx.listing?.id),
      hint: 'İlan seçildiğinde veri havuzu analizi çalışır.'
    }
  ];
}

/**
 * @param {string} [message]
 * @returns {string}
 */
export function buildWorkspaceLoadingHtml(message) {
  const text = safe(message ?? formatLoadingLabel('workspace'));
  return `
    <div class="ai-ws-loading" role="status" aria-live="polite">
      <div class="ai-ws-loading__skeleton ai-ws-loading__skeleton--hero"></div>
      <div class="ai-ws-loading__skeleton"></div>
      <div class="ai-ws-loading__skeleton"></div>
      <p class="ai-ws-loading__text">${text}</p>
    </div>`;
}

/**
 * @param {string} [message]
 * @returns {string}
 */
export function buildWorkspaceDetailSkeletonHtml(message) {
  const text = safe(message ?? formatLoadingLabel('analysis'));
  return `
    <div class="ai-ws-detail-skeleton" role="status" aria-live="polite">
      <div class="ai-ws-detail-skeleton__block ai-ws-detail-skeleton__block--hero"></div>
      <div class="ai-ws-detail-skeleton__block"></div>
      <div class="ai-ws-detail-skeleton__block"></div>
      <p class="ai-ws-detail-skeleton__text">${text}</p>
    </div>`;
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>} [analysis]
 * @returns {string}
 */
function formatPrice(listing) {
  const price = Number(listing.price);
  const currency = String(listing.currency ?? 'TRY');
  if (!Number.isFinite(price)) return '—';
  return `${price.toLocaleString('tr-TR')} ${currency}`;
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string}
 */
export function buildDecisionWorkspaceHtml(ctx) {
  if (!ctx?.listing) {
    return buildDecisionWorkspaceEmptyHtml();
  }

  const listing = /** @type {Record<string, unknown>} */ (ctx.listing);
  const limited = Boolean(ctx.limitedData);
  const pipeline = buildDecisionPipeline(ctx);
  const heat = buildHeatMapSignals(ctx);
  const actions = buildActionCenterActions(ctx);

  const pipelineHtml = pipeline
    .map(
      (step) => `
      <li class="ai-ws-pipeline__step ${pipelineStatusClass(String(step.status))}">
        <span class="ai-ws-pipeline__label">${safe(step.label)}</span>
        <span class="ai-ws-pipeline__note">${safe(step.note)}</span>
      </li>`
    )
    .join('');

  const chipGroup = (title, items, cls) => {
    if (!items.length) return '';
    return `
      <div class="ai-ws-heat__group">
        <h5>${safe(title)}</h5>
        <div class="ai-ws-heat__chips">${items.map((item) => `<span class="ai-ws-heat__chip ai-ws-heat__chip--${cls}">${safe(item)}</span>`).join('')}</div>
      </div>`;
  };

  const actionsHtml = actions
    .map(
      (action) => `
      <button type="button" class="ai-ws-action__btn" data-ws-action="${safe(action.key)}"${
        action.enabled
          ? ` aria-label="${safe(action.label)}"`
          : ` disabled aria-disabled="true" title="${safe(action.hint)}"`
      }>
        ${safe(action.label)}
      </button>`
    )
    .join('');

  return `
    <div class="ai-decision-workspace" data-ws-listing-id="${safe(listing.id)}">
      ${limited ? '<p class="ai-ws-limited">Bu ilan için detay verisi sınırlı. Yine de mevcut bilgilerle özet gösteriliyor.</p>' : ''}

      <section class="ai-ws-summary">
        <header class="ai-ws-summary__head">
          <h3>${safe(listing.title ?? '—')}</h3>
          <span class="ai-ws-summary__status">${safe(formatStatusLabel(listing.status))}</span>
        </header>
        <div class="ai-ws-summary__grid">
          <div><span>Kategori</span><strong>${safe(formatCategoryLabel(listing.category))}</strong></div>
          <div><span>Fiyat</span><strong>${safe(formatPrice(listing))}</strong></div>
          <div><span>Lokasyon</span><strong>${safe(listing.location ?? '—')}</strong></div>
          <div><span>${safe(formatAdminMetricLabel('risk_score'))}</span><strong>${safe(ctx.riskLabel ?? ctx.riskScore ?? '—')}</strong></div>
          <div><span>${safe(formatAdminMetricLabel('ai_score'))}</span><strong>${safe(ctx.aiScore ?? '—')}</strong></div>
          <div><span>${safe(formatAdminMetricLabel('quality_score'))}</span><strong>${safe(ctx.qualityScore ?? '—')}</strong></div>
        </div>
        ${ctx.duplicateLabel ? `<p class="ai-ws-summary__dup">${safe(ctx.duplicateLabel)}</p>` : ''}
        <p class="ai-ws-summary__decision">${safe(ctx.decisionSummary ?? 'Karar özeti üretiliyor; mevcut verilerle değerlendirme yapılabilir.')}</p>
      </section>

      <div class="ai-ws-grid">
        <section class="ai-ws-card">
          <h4>Karar Hattı</h4>
          <ol class="ai-ws-pipeline">${pipelineHtml}</ol>
        </section>

        <section class="ai-ws-card">
          <h4>Yönetici Özeti</h4>
          <div class="ai-ws-snapshot">
            <div><span>Karar etiketi</span><strong>${safe(ctx.decisionLabel ?? '—')}</strong></div>
            <div><span>${safe(formatAdminMetricLabel('decisionScore'))}</span><strong>${safe(ctx.decisionScore ?? '—')}</strong></div>
            <div><span>${safe(formatAdminMetricLabel('confidence_score'))}</span><strong>${safe(ctx.confidenceScore ?? '—')}</strong></div>
            <div><span>Risk seviyesi</span><strong>${safe(formatRiskLevelLabel(ctx.riskLevel) || ctx.riskLevel || '—')}</strong></div>
            <div><span>${safe(formatAdminMetricLabel('trust_score'))}</span><strong>${safe(ctx.trustScore ?? '—')}</strong></div>
            <div><span>${safe(formatAdminMetricLabel('explanation_score'))}</span><strong>${safe(ctx.explanationScore ?? '—')}</strong></div>
            <div><span>${safe(formatAdminMetricLabel('report_score'))}</span><strong>${safe(ctx.reportScore ?? '—')}</strong></div>
            <div><span>Karşılaştırma</span><strong>${ctx.hasCompare ? 'Hazır' : '—'}</strong></div>
          </div>
        </section>

        <section class="ai-ws-card ai-ws-card--wide">
          <h4>AI Isı Haritası</h4>
          <div class="ai-ws-heat">
            ${chipGroup('Güçlü sinyaller', heat.strong, 'strong')}
            ${chipGroup('Zayıf sinyaller', heat.weak, 'weak')}
            ${chipGroup('Riskli sinyaller', heat.risky, 'risk')}
          </div>
        </section>

        <section class="ai-ws-card">
          <h4>Aksiyon Merkezi</h4>
          <div class="ai-ws-action">${actionsHtml}</div>
        </section>

        ${buildScenarioTeaserHtml({ summary: ctx.scenarioTeaser, disabled: !ctx.recommendation?.id })}
      </div>

      <div id="ai-ws-detail-mount" class="ai-ws-detail-mount"></div>
    </div>`;
}

/**
 * @returns {string}
 */
export function buildDecisionWorkspaceEmptyHtml() {
  return `
    <div class="ai-ws-empty">
      <p class="ai-ws-empty__title">AI Karar Çalışma Alanı</p>
      <p class="ai-ws-empty__text">Detayları görmek için sağdan bir ilan seçin.</p>
      <div class="ai-ws-empty__cta">
        <button type="button" class="ai-ws-empty__btn" data-ws-empty-action="recommendations">Öneri üret</button>
        <button type="button" class="ai-ws-empty__btn ai-ws-empty__btn--ghost" data-ws-empty-action="create">Yeni ilan ekle</button>
        <button type="button" class="ai-ws-empty__btn ai-ws-empty__btn--ghost" data-ws-empty-action="repository">Veri havuzuna git</button>
      </div>
    </div>`;
}

/**
 * @param {string} [message]
 * @returns {string}
 */
export function buildWorkspaceErrorHtml(message) {
  return `<p class="ai-ws-error" role="alert">${safe(translateAdminUiError(message))}</p>`;
}
