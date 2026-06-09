import '../runtime/locale-bootstrap.js';
import '../runtime/growth-bootstrap.js';
import {
  enrichLeadMetadata,
  trackGrowth,
  getGrowthContext,
  getStoredReferralCode,
  renderReferralSharePanel,
  bindReferralShare
} from '../features/growth/growth-engine.js';
import { computePartnerMatchScores } from '../features/partner/partner-match-engine.js';
import { trackOpsEvent } from '../core/operational-telemetry.js';
import {
  enrollAutoResultsReady,
  enrollFinanceFollowUp,
  enrollLifecycleKeepalive,
  enrollSavedDecisionRevisit,
  enrollUpsellCampaign
} from '../features/lifecycle/lifecycle-client.js';
import { notifyDecisionSaved } from '../features/growth/retention-ltv.js';
import { recordHabitAction } from '../features/growth/retention-habits.js';
import { ensureServerReferralCode } from '../features/growth/referral-client.js';
import {
  bindContextualUpsell,
  bindUpsellFeatureChips,
  openUpsellCheckout,
  renderContextualUpsellCard,
  renderUpsellFeatureChips,
  shouldShowUpsell
} from '../features/monetization/upsell-engine.js';
import { recommendVehicles, buildMethodologyPanel } from './auto-ai.js?v=ai3';
import { sanitizeAiNarrative } from '../engines/decision-consultant.js';
import { getVehicleCatalog } from './auto-catalog.js?v=truth3';
import { getDealerOffers } from './auto-offers.js?v=offers2';
import { FREE_LIMITS, PLANS } from '../features/monetization/plans.js';
import { analytics } from '../core/analytics.js';
import { bootAnalyticsMeasurement } from '../runtime/analytics-consent-boot.js';
import { mirrorLegacySiteEvent } from '../platform/site-analytics.js';
import { getAutoPartOptions, getAutoStepCopy, sanitizeWizardStateForUsage } from './auto-flow.js';
import {
  HOUSEHOLD_SIZE_OPTIONS,
  buildAutoSuitabilitySignalText,
  resolveCityRatioForSync,
  shouldShowCityRatioField
} from './auto-wizard-profile.js';
import { bootstrapAutoFromAssistantQuery } from '../features/assistant/assistant-vertical-bootstrap.js';
import { mirrorLegacyAutoFunnel, trackAutoStart, trackGrowthFunnel, GROWTH_FUNNEL_EVENTS } from '../features/growth/growth-funnel.js';
import { trackPaidFunnelStep } from '../features/growth/paid-acquisition.js';
import { sendServerPaidConversion } from '../features/growth/paid-capi-bridge.js';
import { escapeHtml } from '../core/security.js';
import { safeJsonParse } from '../core/dom-safe.js';
import { STORAGE_KEYS, readStorageRaw, writeStorageRaw, readStoredJson, writeStoredJson, removeStorageRaw } from '../core/storage-keys.js';
import { mountAutoResultsV2 } from './auto-results-v2.js';
import { formatVehicleFuelDisplay, formatVehicleResaleDisplay } from './auto-results-model.js';
import { adaptAutoCard } from '../features/decision-cards/adapters/auto-adapter.js';
import {
  isDecisionCategoryCardsEnabled,
  isDecisionCardsVertical,
  renderDecisionCategoryCardsGridHtml,
  syncDecisionCardsFlagToDocument
} from '../features/decision-cards/decision-category-card-renderer.js';
import { renderVehicleImageHtml, resolveVehicleImageUrl } from './vehicle-image.js';
import { storeCheckoutIntentPayload } from '../core/checkout-intent.js';
import { saveDecisionHistory, getAppInstance } from '../core/app-bridge.js';
import { revenueManager } from '../features/monetization/revenue-manager.js';
import { getSupabaseClient } from '../core/supabase.js';
import { formatMoney, formatNumber } from '../core/format.js';
import { formatScore, formatScoreOutOf100 } from '../features/results/results-engine.js';
import {
  getOrCreateDecisionSession,
  updateDecisionSession,
  readDecisionSession
} from '../features/moat/moat-session.js';
import {
  mountProductFeedback,
  maybeMountEmailProductFeedback
} from '../features/moat/product-feedback.js';
import { mountOutcomeIntelligence } from '../features/moat/outcome-intelligence.js';
import {
  captureFinancingAccepted,
  captureVehicleRecommendedSelected
} from '../features/moat/outcome-capture.js';
import { buildSegmentKey } from '../features/moat/scoring-intelligence.js';
import {
  renderConfidenceSemanticsPanel,
  renderScoringTransparencyPanel,
  renderLeaderRankPanel,
  renderRunnerRankContrast
} from '../features/moat/scoring-explainability.js';
import {
  buildExplanationBundle,
  buildDeterministicSynthesis,
  renderAiExplanationExperience,
  updateExplanationSynthesis
} from '../features/moat/ai-explanation-experience.js';
import {
  AI_COMMENTARY_STORAGE_KEY,
  AI_COMMENTARY_TIMEOUT_MS,
  buildCommentaryPrompt,
  buildDeterministicDecisionCommentary,
  hydrateStructuredCommentary,
  mergeCommentary,
  parseStructuredCommentary,
  renderStructuredCommentaryPanel
} from './ai-decision-commentary.js';
import {
  renderDecisionInsightPanels,
  renderTrustLayerCompact
} from '../features/moat/decision-insight-panels.js';
import {
  renderComparisonMatrix,
  renderRecommendationIntelligencePanel
} from './recommendation-intelligence.js';
import {
  renderResultsMetadataPanel,
  renderOwnershipBreakdown,
  renderHowCalculatedPanel
} from './ownership-transparency.js';
import { renderProviderCtaStrip } from './providers/index.js';
import { WIZARD_ONBOARDING } from '../features/moat/category-positioning.js';
import { initP4ProductPolish } from '../runtime/p4-product-polish.js';
import { initMobilePremiumUx } from '../runtime/mobile-premium-ux.js';
import { initConversionMicroUx } from '../runtime/conversion-micro-ux.js';
import { initPerceivedPerformance } from '../runtime/perceived-performance.js';
import { initBrandConsistency } from '../runtime/brand-consistency.js';
import { CONVERSION_COPY } from '../core/conversion-copy.js';
import {
  canCallAiNarration,
  getAiNarrationBudgetMessage,
  hasAiNarrationBudget,
  SCALE_LIMITS
} from '../core/scale-limits.js';
import { completeOAuthIfPresent } from '../runtime/auth-oauth-callback.js';

const formatAmount = (value) => formatMoney(value);
const formatCount = (value) => formatNumber(value);

const DECISION_FLOW_STEPS = [
  { key: 'budget', label: 'Bütçe', field: 'budget' },
  { key: 'body', label: 'Araç Tipi', field: 'body' },
  { key: 'usage', label: 'Kullanım Amacı', field: 'usage' },
  { key: 'km', label: 'Yıllık Km', field: 'km' },
  { key: 'fuel', label: 'Yakıt Tercihi', field: 'fuel' },
  { key: 'loan', label: 'Kredi Durumu', field: 'loan' },
  { key: 'priority', label: 'Şehir / otoyol dengesi', field: 'city_ratio' },
  { key: 'vehicle', label: 'Araç seçimi', field: null },
  { key: 'result', label: 'Sonuç', field: null }
];

function findWizardOptionLabel(fieldKey, rawValue) {
  if (!rawValue) return '—';
  if (rawValue === 'custom') {
    const custom = wizardState[`${fieldKey}_custom`];
    if (fieldKey === 'budget' && custom) return `${formatCount(Number(custom))} TL`;
    if (fieldKey === 'km' && custom) return `${formatCount(Number(custom))} km/yıl`;
    if (fieldKey === 'location' && custom) return String(custom);
    return 'Özel değer';
  }

  const pools = [
    ...(wizardSteps[0]?.parts || []),
    ...(wizardSteps[1]?.parts || []),
    ...(wizardSteps[2]?.parts || []),
    wizardSteps[3]?.key === 'loan' ? wizardSteps[3] : null
  ].filter(Boolean);

  for (const part of pools) {
    if (part.key !== fieldKey) continue;
    const hit = part.options?.find((option) => option.value === rawValue);
    if (hit) return hit.label;
  }

  if (fieldKey === 'budget' && rawValue) return `${formatCount(Number(rawValue))} TL`;
  if (fieldKey === 'km' && rawValue) return `${formatCount(Number(rawValue))} km/yıl`;
  return String(rawValue);
}

function getDecisionStepStatuses() {
  const hasResults = Array.isArray(allResults) && allResults.length > 0;
  const selectedVehicle = readSelectedVehicle();

  const steps = DECISION_FLOW_STEPS.map((spec) => {
    if (spec.key === 'result') {
      return {
        ...spec,
        done: hasResults,
        value: hasResults ? 'Analiz hazır' : 'Bekliyor',
        isCurrent: false
      };
    }

    if (spec.key === 'vehicle') {
      return {
        ...spec,
        done: Boolean(selectedVehicle),
        value: selectedVehicle ? selectedVehicle.name : '—',
        isCurrent: false
      };
    }

    const raw = wizardState[spec.field];
    const done = Boolean(raw);
    return {
      ...spec,
      done,
      value: done ? findWizardOptionLabel(spec.field, raw) : '—',
      isCurrent: false
    };
  });

  if (hasResults && selectedVehicle) {
    steps[8].isCurrent = true;
    return steps;
  }

  if (hasResults) {
    steps[7].isCurrent = true;
    return steps;
  }

  const firstIncomplete = steps.findIndex((step) => !['result', 'vehicle'].includes(step.key) && !step.done);
  const currentIndex = firstIncomplete === -1 ? 7 : firstIncomplete;
  steps[currentIndex].isCurrent = true;
  return steps;
}

function renderDecisionStepper() {
  const mount = document.getElementById('auto-decision-stepper-mount');
  if (!mount) return;

  const steps = getDecisionStepStatuses();
  const anyProgress = steps.some((step) => step.done) || wizardIndex > 0;
  mount.hidden = !anyProgress;
  if (!anyProgress) {
    mount.innerHTML = '';
    return;
  }

  mount.innerHTML = `
    <p class="kicker">Karar akışı</p>
    <div class="auto-decision-stepper-track" role="list">
      ${steps.map((step, index) => `
        <div class="auto-decision-step ${step.done ? 'is-done' : ''} ${step.isCurrent ? 'is-current' : ''}" role="listitem">
          <div class="auto-decision-step-dot" aria-hidden="true">${step.done ? '✓' : index + 1}</div>
          <span class="auto-decision-step-label">${escapeHtml(step.label)}</span>
          <span class="auto-decision-step-value">${escapeHtml(step.value)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function getFitLevel(score) {
  const value = Number(score) || 0;
  if (value >= 85) return { label: 'Yüksek', tone: 'ok' };
  if (value >= 70) return { label: 'Orta', tone: 'warn' };
  return { label: 'Gözden geçirin', tone: 'warn' };
}

function getRiskLevel(vehicle) {
  const riskCount = Array.isArray(vehicle?.risks) ? vehicle.risks.length : 0;
  const maintenance = Number(vehicle?.maintenance ?? 5);
  if (riskCount >= 2 || maintenance >= 8) return { label: 'Orta', tone: 'warn' };
  if (riskCount >= 1 || maintenance >= 6) return { label: 'Orta-Düşük', tone: 'warn' };
  return { label: 'Düşük', tone: 'ok' };
}

function buildFiveYearCostBreakdown(vehicle) {
  const own = vehicle?.costs?.ownership;
  if (!own) return null;

  const annual = own.annual || {};
  const years = 5;
  const vehiclePrice = Number(own.purchaseCost || vehicle.price || 0);
  const creditCost = Math.round((own.financing?.annual || 0) * years);
  const insurance = Math.round(((annual.insurance || 0) + (annual.kasko || 0)) * years);
  const fuel = Math.round((annual.fuel || 0) * years);
  const maintenance = Math.round(
    ((annual.maintenance || 0) + (annual.inspection || 0) + (annual.tires || 0)) * years
  );
  const total = vehiclePrice + creditCost + insurance + fuel + maintenance;

  return {
    vehiclePrice,
    creditCost,
    insurance,
    fuel,
    maintenance,
    total,
    disclaimer: '5 yıl tahmini · bilgilendirme amaçlı; gerçek teklif değildir.'
  };
}

function buildDecisionAiBlurb(topResult, formData) {
  const commentary = buildDeterministicDecisionCommentary(
    topResult ? [topResult] : [],
    formData || {}
  );
  const text = commentary?.executive_summary
    || topResult?.reasons?.[0]
    || 'Kriterlerinize göre hesaplanmış örnek analiz çıktısı; canlı ilan değildir.';
  return String(text).slice(0, 420);
}

function renderDecisionDashboard(topResult, formData) {
  if (!topResult) return '';

  const score = Number(topResult.score) || 0;
  const scoreLabel = formatScore(score);
  const fit = getFitLevel(score);
  const risk = getRiskLevel(topResult);
  const costs = buildFiveYearCostBreakdown(topResult);
  const monthlyImpact = Math.round((Number(topResult.costs?.total || 0) / 12) / 100) * 100;

  const costRows = costs ? `
    <ul class="auto-cost-rows">
      <li><span>Araç bedeli (tahmini)</span><strong>${formatAmount(costs.vehiclePrice)}</strong></li>
      <li><span>Kredi maliyeti (5 yıl)</span><strong>${formatAmount(costs.creditCost)}</strong></li>
      <li><span>Sigorta &amp; kasko</span><strong>${formatAmount(costs.insurance)}</strong></li>
      <li><span>Yakıt gideri</span><strong>${formatAmount(costs.fuel)}</strong></li>
      <li><span>Bakım &amp; onarım</span><strong>${formatAmount(costs.maintenance)}</strong></li>
      <li class="is-total"><span>Toplam tahmini maliyet</span><strong>${formatAmount(costs.total)}</strong></li>
    </ul>
    <p class="text-muted-sm">${escapeHtml(costs.disclaimer)}</p>
  ` : `<p class="text-muted-sm">Maliyet özeti bu model için henüz hesaplanamadı.</p>`;

  return `
    <section class="auto-decision-dashboard" aria-label="Karar özeti paneli">
      <article class="auto-dash-card auto-dash-score-ring">
        <p class="kicker">Karar skoru</p>
        <div class="auto-dash-gauge" style="--score-pct: ${Math.min(100, Math.max(0, score))}">
          <strong>${escapeHtml(scoreLabel)}<span style="font-size:0.55em;font-weight:600">/100</span></strong>
        </div>
        <div class="auto-dash-badges">
          <span class="auto-dash-badge auto-dash-badge--${fit.tone}">Uygunluk: ${escapeHtml(fit.label)}</span>
          <span class="auto-dash-badge auto-dash-badge--${risk.tone}">Risk: ${escapeHtml(risk.label)}</span>
        </div>
        <p class="text-muted-sm">Yaklaşık aylık yük: <strong>${formatAmount(monthlyImpact)}</strong></p>
      </article>

      <article class="auto-dash-card auto-dash-ai">
        <p class="kicker">AI analiz sonucunuz</p>
        <h3>Kural tabanlı özet</h3>
        <p>${escapeHtml(buildDecisionAiBlurb(topResult, formData))}</p>
        <p class="text-muted-sm">AI yalnızca gerekçe metnini zenginleştirir; skor ve maliyet kural tabanlıdır.</p>
      </article>

      <article class="auto-dash-card auto-dash-cost">
        <p class="kicker">5 yıllık toplam maliyet özeti</p>
        <h3>Tahmini sahip olma</h3>
        ${costRows}
      </article>
    </section>
  `;
}

function renderResultsSidebar(topResult, results) {
  const reasons = [];
  (results || []).slice(0, 3).forEach((vehicle, index) => {
    (vehicle.reasons || []).slice(0, 1).forEach((reason) => {
      reasons.push(`${index + 1}. ${vehicle.name}: ${reason}`);
    });
  });

  const warnings = new Set();
  (results || []).slice(0, 3).forEach((vehicle) => {
    (vehicle.risks || []).slice(0, 2).forEach((risk) => warnings.add(risk));
  });
  warnings.add('Kredi faiz oranları değişken olabilir.');
  warnings.add('Araç değer aralıklarını karşılaştırın.');
  warnings.add('Araç ekspertiz raporunu kontrol edin.');

  return `
    <aside class="auto-results-side" aria-label="Sonuç destek notları">
      <div class="auto-side-card">
        <h4>Neden bu araçlar?</h4>
        <ul>
          ${reasons.length
    ? reasons.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>Bütçe, kullanım ve yakıt kriterlerinize göre sıralanmış örnek model önerileridir.</li>'}
        </ul>
      </div>
      <div class="auto-side-card auto-side-card--warn">
        <h4>Dikkat edilmesi gerekenler</h4>
        <ul>
          ${[...warnings].slice(0, 6).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      ${topResult ? `
        <div class="auto-side-card">
          <h4>Veri güven bandı</h4>
          <p class="text-muted-sm">${escapeHtml(topResult.confidenceMeta?.label || 'Girdi kalitesine göre metodolojik destek seviyesi.')}</p>
        </div>
      ` : ''}
    </aside>
  `;
}

function shouldUseDecisionCategoryCards() {
  return isDecisionCategoryCardsEnabled() && isDecisionCardsVertical('auto');
}

function resolveAutoScenarioKey(vehicle = {}) {
  return String(vehicle.id || vehicle.catalog_id || vehicle.name || 'unknown');
}

function buildDecisionCategoryCardViewModels(cardVehicles, formData = {}) {
  return cardVehicles.map((vehicle) => {
    const scenarioKey = resolveAutoScenarioKey(vehicle);
    const baseSuitability = vehicle.confidenceMeta?.label || vehicle.suitability || '';
    const enriched = {
      ...vehicle,
      id: scenarioKey,
      title: vehicle.name,
      description: vehicle.reasons?.[0] || vehicle.name || '',
      fuelDisplay: formatVehicleFuelDisplay(vehicle, formData),
      resaleDisplay: formatVehicleResaleDisplay(vehicle),
      suitability: buildAutoSuitabilitySignalText(formData, baseSuitability)
    };
    return adaptAutoCard({
      scenario: enriched,
      state: formData
    });
  });
}

function renderScenarioCardsHtml(cardVehicles, formData = {}) {
  const selected = readSelectedVehicle();
  const selectedId = selected?.id
    ? String(selected.id)
    : selected?.name
      ? String(selected.name)
      : '';

  if (shouldUseDecisionCategoryCards()) {
    syncDecisionCardsFlagToDocument(true);
    const viewModels = buildDecisionCategoryCardViewModels(cardVehicles, formData);
    return renderDecisionCategoryCardsGridHtml(viewModels, {
      selectedId,
      ariaLabel: 'Öne çıkan araç önerileri'
    });
  }

  syncDecisionCardsFlagToDocument(false);
  return `
    <div id="auto-results-cards" class="auto-results-cards auto-rec-cards" role="list" aria-label="Öne çıkan araç önerileri">
      ${cardVehicles.map((vehicle, index) => renderCompactRecommendationCard(vehicle, index, formData)).join('')}
    </div>`;
}

function scrollToAutoCompareSection() {
  const resultsRoot = document.getElementById('auto-results');
  const target = resultsRoot?.querySelector('.ib-auto-compare-matrix, .comparison-matrix');
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectAutoVehicleFromDecisionCard(optionId, cardVehicles) {
  const matchOption = (item) => resolveAutoScenarioKey(item) === String(optionId);
  const vehicle =
    cardVehicles.find(matchOption) || allResults.find(matchOption);
  if (!vehicle) return;

  const index = allResults.findIndex(matchOption);
  writeSelectedVehicle({
    ...vehicle,
    id: resolveAutoScenarioKey(vehicle),
    index: index >= 0 ? index : undefined
  });
  trackAutoEvent('auto_vehicle_selected', {
    vehicle: vehicle.name,
    index: index >= 0 ? index : null,
    score: vehicle.score,
    source: 'decision_card'
  });
  captureVehicleRecommendedSelected({
    vehicle: vehicle.name,
    interestType: 'vehicle_selected',
    form: readForm(document.getElementById('auto-form'))
  });

  renderFilteredAutoResults();
  mountAutoPartnerNextSteps();
  renderDecisionStepper();

  const partnerMount = document.getElementById('auto-partner-next-mount');
  partnerMount?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bindDecisionCardEvents(root, cardVehicles) {
  if (!root || !shouldUseDecisionCategoryCards()) return;

  root.querySelectorAll('.ib-decision-card-select').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      selectAutoVehicleFromDecisionCard(button.dataset.option, cardVehicles);
    });
  });

  root.querySelectorAll('.ib-decision-card-secondary[data-action="compare"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      scrollToAutoCompareSection();
    });
  });

  root.querySelectorAll('.ib-decision-category-card[data-option]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      selectAutoVehicleFromDecisionCard(card.dataset.option, cardVehicles);
    });
  });
}

function renderCompactRecommendationCard(vehicle, index, formData = {}) {
  const monthlyImpact = Math.round((Number(vehicle.costs?.total || 0) / 12) / 100) * 100;
  const rankClass = index === 0 ? 'auto-rec-rank--best' : index === 1 ? 'auto-rec-rank--good' : 'auto-rec-rank--alt';
  const rankLabel = index === 0 ? 'En uygun' : index === 1 ? 'Çok iyi' : 'İyi';
  const cardClass = index === 0 ? 'auto-rec-card auto-rec-card--best' : 'auto-rec-card';
  const price = Number(vehicle.price || 0);
  const priceBand = price
    ? `${formatAmount(Math.round(price * 0.97))} – ${formatAmount(Math.round(price * 1.03))}`
    : 'Fiyat bandı tahmini';
  const fuelNote = formatVehicleFuelDisplay(vehicle, formData);
  const resale = formatVehicleResaleDisplay(vehicle);
  const maintRisk = Number(vehicle.maintenance || 5) >= 7 ? 'Orta' : 'Düşük';

  return `
    <article class="premium-result-card ${cardClass}" role="listitem">
      <div class="auto-rec-card__media">
        ${renderVehicleImageHtml(vehicle, escapeHtml, { className: 'auto-rec-card__image', width: 480, height: 270 })}
      </div>
      <span class="auto-rec-rank ${rankClass}">${escapeHtml(rankLabel)}</span>
      <h3>${escapeHtml(vehicle.name)}</h3>
      <dl class="auto-rec-metrics">
        <div><dt>Fiyat aralığı</dt><dd>${escapeHtml(priceBand)}</dd></div>
        <div><dt>Aylık maliyet</dt><dd>${formatAmount(monthlyImpact)}</dd></div>
        <div><dt>Yakıt</dt><dd>${escapeHtml(fuelNote)}</dd></div>
        <div><dt>İkinci El Gücü</dt><dd>${escapeHtml(resale)}</dd></div>
        <div><dt>Bakım riski</dt><dd>${escapeHtml(maintRisk)}</dd></div>
      </dl>
      <div class="auto-rec-score">
        <span>Karar skoru</span>
        <div class="auto-rec-score-bar" role="meter" aria-valuenow="${vehicle.score}" aria-valuemin="0" aria-valuemax="100">
          <i style="width:${Math.min(100, vehicle.score)}%"></i>
        </div>
        <strong>${escapeHtml(formatScoreOutOf100(vehicle.score))}</strong>
      </div>
      <div class="auto-rec-actions">
        <button type="button" class="btn primary btn-sm" data-auto-open-detail="${index}" aria-label="Detaylı analiz: ${escapeHtml(vehicle.name)}">Detaylı Analiz</button>
        <button type="button" class="btn secondary btn-sm auto-compare-btn" data-result-index="${index}" data-vehicle="${escapeHtml(vehicle.name)}" data-track-compare="1">Karşılaştır</button>
        <button type="button" class="btn secondary btn-sm auto-shortlist-btn auto-fav-btn" data-result-index="${index}" data-vehicle="${escapeHtml(vehicle.name)}" aria-label="Favorilere ekle">♥</button>
      </div>
    </article>
  `;
}

function readSelectedVehicle() {
  return readStoredJson(STORAGE_KEYS.AUTO_SELECTED_VEHICLE, null, sessionStorage);
}

function writeSelectedVehicle(vehicle) {
  if (!vehicle?.name) {
    removeStorageRaw(STORAGE_KEYS.AUTO_SELECTED_VEHICLE, sessionStorage);
    return;
  }
  writeStoredJson(
    STORAGE_KEYS.AUTO_SELECTED_VEHICLE,
    {
      name: vehicle.name,
      id: vehicle.id || vehicle.catalog_id || null,
      index: Number.isFinite(Number(vehicle.index)) ? Number(vehicle.index) : null,
      confirmedAt: new Date().toISOString()
    },
    sessionStorage
  );
}

function clearSelectedVehicle() {
  removeStorageRaw(STORAGE_KEYS.AUTO_SELECTED_VEHICLE, sessionStorage);
}

function scrollToVehicleSelection() {
  document.getElementById('auto-vehicle-selection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showVehicleSelectionRequiredNotice() {
  scrollToVehicleSelection();
  const gate = document.getElementById('auto-vehicle-selection');
  if (!gate) return;
  gate.classList.add('auto-vehicle-selection--required');
  gate.setAttribute('aria-invalid', 'true');
  window.setTimeout(() => {
    gate.classList.remove('auto-vehicle-selection--required');
    gate.removeAttribute('aria-invalid');
  }, 2400);
}

function formatVehicleTcoBreakdown(vehicle) {
  const costs = vehicle?.costs || {};
  const total12 = Number(costs.total || 0);
  const fuel = Number(costs.fuel || costs.ownership?.annual?.fuel || 0);
  const insurance = Number(costs.insurance || costs.ownership?.annual?.insurance || 0);
  const kasko = Number(costs.kasko || costs.ownership?.annual?.kasko || 0);
  const maintenance = Number(costs.maintenance || costs.ownership?.annual?.maintenance || 0);
  const parts = [
    total12 ? `12 ay TCO ≈ ${formatAmount(total12)}` : null,
    fuel ? `yakıt ${formatAmount(fuel)}` : null,
    insurance ? `sigorta ${formatAmount(insurance)}` : null,
    kasko ? `kasko ${formatAmount(kasko)}` : null,
    maintenance ? `bakım ${formatAmount(maintenance)}` : null
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : '';
}

function renderVehicleSelectionGate(displayResults) {
  const selected = readSelectedVehicle();
  const cards = (displayResults || []).slice(0, 3);
  if (!cards.length) return '';

  return `
    <section id="auto-vehicle-selection" class="auto-vehicle-selection" aria-labelledby="auto-vehicle-selection-title">
      <div class="section-head">
        <p class="kicker">Son karar turu</p>
        <h2 id="auto-vehicle-selection-title">Tek bir aracı seçin</h2>
        <p class="section-subtitle">3 öneriden birini onaylayın; kredi, sigorta veya bayi yönlendirmesi seçtiğiniz modele göre ilerler.</p>
      </div>
      <div class="auto-vehicle-selection-grid" role="radiogroup" aria-label="Araç seçimi">
        ${cards
          .map((vehicle, index) => {
            const isSelected = selected?.name === vehicle.name;
            const monthlyImpact = Math.round((Number(vehicle.costs?.total || 0) / 12) / 100) * 100;
            const tcoLine = formatVehicleTcoBreakdown(vehicle);
            return `
          <button
            type="button"
            class="auto-vehicle-select-card auto-option-card ${isSelected ? 'is-selected' : ''}"
            data-auto-vehicle-select="${index}"
            data-vehicle-name="${escapeHtml(vehicle.name)}"
            role="radio"
            aria-checked="${isSelected ? 'true' : 'false'}"
          >
            <span class="auto-vehicle-select-rank">#${index + 1}</span>
            <strong>${escapeHtml(vehicle.name)}</strong>
            <span class="auto-vehicle-select-score">${escapeHtml(formatScoreOutOf100(vehicle.score))} uyum</span>
            <span class="auto-vehicle-select-cost">~${escapeHtml(formatAmount(monthlyImpact))} / ay</span>
            ${tcoLine ? `<span class="auto-vehicle-select-tco text-muted-sm">${escapeHtml(tcoLine)}</span>` : ''}
            <span class="auto-vehicle-select-cta">${isSelected ? '✓ Seçildi' : 'Bu aracı seç'}</span>
          </button>`;
          })
          .join('')}
      </div>
      ${
        selected
          ? `<p class="auto-vehicle-selection-confirmed">Seçiminiz: <strong>${escapeHtml(selected.name)}</strong> — aşağıdaki yönlendirme adımlarına geçebilirsiniz.</p>`
          : `<p class="auto-vehicle-selection-hint text-muted-sm">Devam etmek için yukarıdan bir model seçin.</p>`
      }
    </section>
  `;
}

function bindVehicleSelectionGate(root) {
  if (!root) return;
  root.querySelectorAll('[data-auto-vehicle-select]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.getAttribute('data-auto-vehicle-select'));
      const vehicle = allResults[index] || lastResults[index];
      if (!vehicle) return;

      writeSelectedVehicle({ ...vehicle, index });
      trackAutoEvent('auto_vehicle_selected', {
        vehicle: vehicle.name,
        index,
        score: vehicle.score
      });
      captureVehicleRecommendedSelected({
        vehicle: vehicle.name,
        interestType: 'vehicle_selected',
        form: readForm(document.getElementById('auto-form'))
      });

      renderFilteredAutoResults();
      mountAutoPartnerNextSteps();
      renderDecisionStepper();

      const partnerMount = document.getElementById('auto-partner-next-mount');
      partnerMount?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function mountAutoPartnerNextSteps() {
  const mount = document.getElementById('auto-partner-next-mount');
  if (!mount) return;

  if (!Array.isArray(allResults) || !allResults.length) {
    mount.hidden = true;
    mount.innerHTML = '';
    return;
  }

  const selected = readSelectedVehicle();
  mount.hidden = false;

  if (!selected?.name) {
    mount.innerHTML = `
      <div class="section-head">
        <p class="kicker">Sonraki adım</p>
        <h2>Önce aracınızı seçin</h2>
        <p class="section-subtitle">Yukarıdaki listeden tek bir model seçerek kredi, sigorta veya bayi yönlendirmesine geçin.</p>
      </div>
      <button type="button" class="btn secondary" data-auto-scroll-selection>Araç seçimine git</button>
    `;
    mount.querySelector('[data-auto-scroll-selection]')?.addEventListener('click', scrollToVehicleSelection);
    return;
  }

  const vehicleName = escapeHtml(selected.name);
  mount.innerHTML = `
    <div class="section-head">
      <p class="kicker">Sonraki adım</p>
      <h2>${vehicleName} için yönlendirme</h2>
      <p class="section-subtitle">Seçiminize göre tek bir partner akışı — bağlayıcı teklif değildir.</p>
    </div>
    <div class="auto-partner-next auto-partner-next--branch">
      <button type="button" class="auto-partner-next-card auto-interest-btn" data-interest="finance" data-vehicle="${vehicleName}" data-branch="credit">
        <strong>Kredi tekliflerini karşılaştır</strong>
        <span>Finansman simülasyonu · banka onayı ayrıdır</span>
      </button>
      <button type="button" class="auto-partner-next-card auto-interest-btn" data-interest="insurance" data-vehicle="${vehicleName}" data-branch="insurance">
        <strong>Sigorta &amp; kasko teklifi</strong>
        <span>Seçilen modele göre prim bandı</span>
      </button>
      <button type="button" class="auto-partner-next-card auto-interest-btn" data-interest="dealer_match" data-vehicle="${vehicleName}" data-branch="dealer">
        <strong>Bayi / satıcı görüşmesi</strong>
        <span>Uygun eşleşme talebi</span>
      </button>
    </div>
    <p class="auto-partner-next-change text-muted-sm">
      <button type="button" class="btn btn-ghost btn-sm" data-auto-change-vehicle>← Farklı araç seç</button>
    </p>
  `;

  mount.querySelector('[data-auto-change-vehicle]')?.addEventListener('click', () => {
    clearSelectedVehicle();
    renderFilteredAutoResults();
    mountAutoPartnerNextSteps();
    renderDecisionStepper();
    scrollToVehicleSelection();
  });
}

const ONBOARDING_STARTED_KEY = 'istebul_auto_onboarding_started';
const UPSELL_RESULTS_KEY = 'istebul_auto_results_count';

document.documentElement.classList.add('ib-ready');
document.body?.classList.add('ib-ready');

completeOAuthIfPresent().catch(() => {});

function isProActive() {
  return Boolean(revenueManager.isPremium);
}

async function initAutoEntitlements() {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    await revenueManager.refresh(session?.user?.id || null);
    if (session?.user) {
      ensureServerReferralCode().catch(() => {});
    }
    sb.auth.onAuthStateChange((_event, session) => {
      revenueManager.refresh(session?.user?.id || null).catch(() => {});
      if (session?.user) {
        ensureServerReferralCode().catch(() => {});
      }
    });
  } catch {
    await revenueManager.refresh(null);
  }
}

const AUTO_SOFT_GATE_KEY = 'istebul_auto_soft_gate_dismissed';

const WIZARD_ETA_BY_STEP = ['~45 sn kaldı', '~30 sn kaldı', '~15 sn kaldı', 'Son adım'];

function openAutoSoftAuthGate() {
  if (document.getElementById('auto-soft-auth-gate')) return;

  const overlay = document.createElement('div');
  overlay.id = 'auto-soft-auth-gate';
  overlay.className = 'auto-soft-auth-gate revenue-paywall';
  overlay.innerHTML = `
    <div class="revenue-paywall-card auto-soft-auth-card" role="dialog" aria-labelledby="auto-soft-auth-title" aria-modal="true">
      <button type="button" class="revenue-paywall-close" data-auto-soft-gate-close aria-label="Kapat">×</button>
      <p class="kicker">Sonuçlarınız hazır</p>
      <h3 id="auto-soft-auth-title">Önizlemeyi gördünüz — detaylı raporu açın</h3>
      <p>Kaydetmek ve geçmişe erişmek için ücretsiz hesap; Pro ile tam rapor, senaryo karşılaştırma ve gelişmiş AI açıklaması.</p>
      <ul class="revenue-paywall-list">
        <li>Karar geçmişi ve favoriler</li>
        <li>Karşılaştırma merkezi</li>
        <li>KVKK uyumlu veri işleme</li>
      </ul>
      <div class="auto-soft-auth-actions">
        <a class="btn primary" href="/kayit?return=/auto/" data-auto-soft-gate-register>Ücretsiz hesap oluştur</a>
        <a class="btn secondary" href="/giris?return=/auto/" data-auto-soft-gate-login>Giriş yap</a>
        <button type="button" class="btn secondary" data-auto-soft-gate-close>Ücretsiz önizlemeyle devam et</button>
      </div>
      <p class="text-muted-sm auto-soft-auth-foot">Bağlayıcı teklif veya satın alma zorunluluğu yok.</p>
    </div>
  `;

  const close = () => {
    try {
      sessionStorage.setItem(AUTO_SOFT_GATE_KEY, '1');
    } catch {
      /* ignore */
    }
    overlay.remove();
    trackAutoEvent('auto_soft_gate_dismiss');
  };

  overlay.querySelectorAll('[data-auto-soft-gate-close]').forEach((el) => {
    el.addEventListener('click', close);
  });
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector('[data-auto-soft-gate-register]')?.addEventListener('click', () => {
    trackAutoEvent('auto_soft_gate_register_click');
  });
  overlay.querySelector('[data-auto-soft-gate-login]')?.addEventListener('click', () => {
    trackAutoEvent('auto_soft_gate_login_click');
  });

  document.body.appendChild(overlay);
  trackAutoEvent('auto_soft_gate_view');
}

function maybeShowAutoSoftAuthGate() {
  if (getAppInstance()?.currentUser) return;
  try {
    if (sessionStorage.getItem(AUTO_SOFT_GATE_KEY)) return;
  } catch {
    return;
  }

  window.setTimeout(() => {
    if (getAppInstance()?.currentUser) return;
    try {
      if (sessionStorage.getItem(AUTO_SOFT_GATE_KEY)) return;
    } catch {
      return;
    }
    openAutoSoftAuthGate();
  }, 8000);
}

function openAutoUpgradePaywall(feature = 'premium_report') {
  const existing = document.getElementById('auto-revenue-paywall');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'auto-revenue-paywall';
  overlay.className = 'revenue-paywall';
  overlay.innerHTML = `
    <div class="revenue-paywall-card" role="dialog">
      <button type="button" class="revenue-paywall-close" data-auto-paywall-close aria-label="Kapat">×</button>
      <span class="revenue-upgrade-kicker">isteBul Pro</span>
      <h3>${feature === 'premium_report' ? 'Detaylı karar raporu' : 'Pro özellik'}</h3>
      <p>${PLANS.pro.description}</p>
      <ul class="revenue-paywall-list">
        ${PLANS.pro.highlights.slice(0, 4).map((item) => `<li>${item}</li>`).join('')}
      </ul>
      <div class="revenue-upgrade-actions">
        <a class="btn primary" href="/planlar?checkout=pro" data-auto-checkout-intent>7 gün ücretsiz dene</a>
        <button type="button" class="btn secondary" data-auto-paywall-close>Ücretsiz önizlemeyle devam et</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();
  overlay.querySelectorAll('[data-auto-paywall-close]').forEach((el) => el.addEventListener('click', close));
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.body.appendChild(overlay);
}

function renderAutoResultsInterpretationGuide(topResult, formData = {}) {
  const score = topResult?.score ?? '—';
  const monthly = topResult?.costs?.total
    ? formatAmount(Math.round(Number(topResult.costs.total) / 12))
  : '—';

  return `
    <section class="auto-results-guide" aria-label="Sonuçları nasıl okursunuz">
      <p class="auto-results-guide-kicker">Sonuç rehberi</p>
      <h3>Sonuçlarınızı nasıl yorumlarsınız?</h3>
      <ol class="auto-results-guide-steps">
        <li><strong>Uyum skoru ${escapeHtml(formatScoreOutOf100(score))}</strong> — Bütçe ve kullanımınıza göre sıralama göstergesidir; satın alma garantisi değildir.</li>
        <li><strong>Yaklaşık aylık yük ${escapeHtml(monthly)}</strong> — 12 aylık toplam maliyetin parçasıdır; finansman tercihinize göre değişir.</li>
        <li><strong>Sonraki adım</strong> — Modelleri karşılaştırın; detaylı rapor için Pro seçeneğini değerlendirin.</li>
      </ol>
      <div class="auto-results-guide-actions">
        <a class="btn secondary" href="/karsilastir/">Karşılaştırma merkezi</a>
        <a class="btn primary" href="/planlar?checkout=pro" data-auto-checkout-intent>TCO analizini derinleştir (Pro)</a>
      </div>
      <p class="auto-results-guide-foot text-muted-sm">Bilgilendirme amaçlıdır. Canlı ilan veya bağlayıcı teklif değildir.</p>
    </section>
  `;
}

function renderAutoUpgradeStrip(className = '') {
  if (isProActive()) return '';

  const extraClass = className ? ` ${className}` : '';

  return `
    <aside class="revenue-upgrade-banner revenue-upgrade-banner--compact${extraClass}">
      <div class="revenue-upgrade-copy">
        <span class="revenue-upgrade-kicker">isteBul Pro</span>
        <strong>Tüm sonuçları ve premium raporu açın</strong>
        <p>Ücretsiz planda ${FREE_LIMITS.maxAutoResultsPreview} model önerisi görürsünüz. Pro ile sınırsız karşılaştırma — ilk abonelikte 7 gün ücretsiz deneme.</p>
      </div>
      <div class="revenue-upgrade-actions">
        <a class="btn btn-primary" href="/planlar?checkout=pro" data-auto-checkout-intent>7 gün ücretsiz dene</a>
        <a class="btn btn-outline" href="/planlar">Planları incele</a>
      </div>
    </aside>
  `;
}

function renderResultsLeaderSummary(topResult, { displayCount, totalCount }) {
  if (!topResult) return '';

  const monthlyImpact = Math.round((Number(topResult.costs?.total || 0) / 12) / 100) * 100;
  const totalLabel = totalCount > displayCount
    ? `${displayCount} / ${totalCount} model önerisi`
    : `${displayCount} model önerisi`;

  return `
    <section id="auto-results-leader" class="auto-results-leader" tabindex="-1" aria-live="polite">
      <p class="kicker">Karar analizi tamamlandı</p>
      <h3 class="auto-results-leader-title">${escapeHtml(totalLabel)} hazır</h3>
      <div class="auto-results-leader-highlight">
        <span class="auto-results-leader-badge">#1 · Genel uyum lideri</span>
        <p class="auto-results-leader-name">${escapeHtml(topResult.name)}</p>
        <dl class="auto-results-leader-metrics">
          <div>
            <dt>Uyum skoru</dt>
            <dd><strong>${escapeHtml(formatScoreOutOf100(topResult.score))}</strong></dd>
          </div>
          <div>
            <dt>Yaklaşık aylık yük</dt>
            <dd><strong>${escapeHtml(formatAmount(monthlyImpact))}</strong></dd>
          </div>
        </dl>
        <div class="auto-results-leader-cta">
          <button type="button" class="btn primary" data-auto-scroll-selection>
            Aracınızı seçin
          </button>
          <a class="btn secondary" href="#auto-results-cards">Tüm önerilere in</a>
        </div>
      </div>
      <p class="auto-results-trust-line text-muted-sm">
        Canlı ilan veya bağlayıcı teklif değildir; metodolojik model önerisidir.
        <a href="#auto-results-deep-dive">Güven ve metodoloji</a>
      </p>
    </section>
  `;
}

function renderAutoFilterToolbar(displayResults, results, pro) {
  return `
    <section class="auto-filter-toolbar" aria-label="Auto sonuç filtreleri">
      <div>
        <strong>${displayResults.length} / ${allResults.length || results.length} öneri gösteriliyor</strong>
        ${!pro && results.length > displayResults.length ? '<span class="revenue-partner-strip"><strong>Pro</strong> ile +' + (results.length - displayResults.length) + ' model daha</span>' : ''}
        <span>Sonuçları kullanım önceliğinize göre düzenleyin.</span>
      </div>

      <label>
        Yakıt
        <select data-auto-filter="fuel">
          <option value="all" ${resultFilters.fuel === 'all' ? 'selected' : ''}>Tümü</option>
          <option value="electric" ${resultFilters.fuel === 'electric' ? 'selected' : ''}>Elektrik</option>
          <option value="hybrid" ${resultFilters.fuel === 'hybrid' ? 'selected' : ''}>Hibrit</option>
          <option value="gasoline" ${resultFilters.fuel === 'gasoline' ? 'selected' : ''}>Benzin</option>
          <option value="diesel" ${resultFilters.fuel === 'diesel' ? 'selected' : ''}>Dizel</option>
        </select>
      </label>

      <label>
        Kasa
        <select data-auto-filter="body">
          <option value="all" ${resultFilters.body === 'all' ? 'selected' : ''}>Tümü</option>
          <option value="suv" ${resultFilters.body === 'suv' ? 'selected' : ''}>SUV</option>
          <option value="sedan" ${resultFilters.body === 'sedan' ? 'selected' : ''}>Sedan</option>
          <option value="hatchback" ${resultFilters.body === 'hatchback' ? 'selected' : ''}>Hatchback</option>
        </select>
      </label>

      <label>
        Sırala
        <select data-auto-filter="sort">
          <option value="score" ${resultFilters.sort === 'score' ? 'selected' : ''}>Uyum skoruna göre</option>
          <option value="price_asc" ${resultFilters.sort === 'price_asc' ? 'selected' : ''}>En düşük fiyat</option>
          <option value="family" ${resultFilters.sort === 'family' ? 'selected' : ''}>Aile kullanımına göre</option>
          <option value="city" ${resultFilters.sort === 'city' ? 'selected' : ''}>Şehir kullanımına göre</option>
          <option value="long" ${resultFilters.sort === 'long' ? 'selected' : ''}>Uzun yola göre</option>
        </select>
      </label>
    </section>
  `;
}

function renderResultsDeepDive({ results, topResult, formData, rankNote, rankIntelPanel }) {
  return `
    <details class="auto-results-deep-dive" id="auto-results-deep-dive">
      <summary>Güven, metodoloji ve sonuçları nasıl okursunuz</summary>
      <div class="auto-results-deep-dive-body">
        <section class="auto-results-trust-banner auto-results-trust-banner--inset" aria-label="Sonuç açıklaması">
          <div>
            <p class="kicker">Model önerisi · metodolojik destek</p>
            <h3>Bu sonuçlar canlı ilan değil; ihtiyaç profilinize göre hazırlanmış referans model önerileridir.</h3>
            <p><strong>Uyum skoru</strong> satın alma önerisi değil, kriterlerinize göre sıralama içindir. <strong>Veri güven bandı</strong> girdi kalitesini gösterir. AI yalnızca gerekçe metni üretir — skor ve TCO kural tabanlıdır.</p>
            ${rankNote ? `<p class="auto-rank-explanation">${escapeHtml(rankNote)}</p>` : ''}
          </div>
          <button type="button" class="btn primary auto-interest-btn" data-interest="vehicle_offer" data-vehicle="${escapeHtml(topResult?.name || 'Araç önerisi')}">
            Uygun satıcı eşleşmesi iste
          </button>
        </section>

        ${renderAutoResultsInterpretationGuide(topResult, formData)}

        ${renderTrustLayerCompact('auto')}

        ${renderResultsMetadataPanel(results, formData, escapeHtml)}

        ${renderAutoMethodologyStrip()}

        ${rankIntelPanel || ''}
      </div>
    </details>
  `;
}

function scrollToAutoResultsLeader() {
  const leader = document.getElementById('auto-results-leader');
  if (leader) {
    leader.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  document.getElementById('analiz')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getBestFinanceOffer(financeOffers, budget) {
  if (!Array.isArray(financeOffers) || !financeOffers.length) return null;

  const eligible = financeOffers.filter((offer) => {
    const min = Number(offer.min_amount || 0);
    const max = Number(offer.max_amount || 999999999);
    return budget >= min && budget <= max;
  });

  return (eligible.length ? eligible : financeOffers)[0];
}


const autoRuntimeConfig = {
  whatsappPhone: '905456786420'
};

async function loadAutoRuntimeConfig() {
  const supabaseUrl = window.__env?.SUPABASE_URL;
  const supabaseKey = window.__env?.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/site_settings?select=key,value&key=in.(auto_whatsapp_phone)`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) return;

    const rows = await response.json();
    const phoneSetting = rows.find(row => row.key === 'auto_whatsapp_phone')?.value;
    const cleanPhone = String(phoneSetting || '').replace(/\D/g, '');

    if (cleanPhone.length >= 10) {
      autoRuntimeConfig.whatsappPhone = cleanPhone;
    }
  } catch {}
}


function getSessionId() {
  let id = sessionStorage.getItem(STORAGE_KEYS.AUTO_SESSION);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEYS.AUTO_SESSION, id);
  }
  return id;
}

function shouldTrackUnique(eventName, key = '') {
  const token = `tracked:${eventName}:${key}`;
  if (sessionStorage.getItem(token)) return false;
  sessionStorage.setItem(token, '1');
  return true;
}

function readForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function getCurrentLeadPayload() {
  const autoForm = document.getElementById('auto-form');
  const formPayload = autoForm ? readForm(autoForm) : {};
  const storedPayload = safeJsonParse(readStorageRaw(STORAGE_KEYS.AUTO_LEAD_PAYLOAD), {});
  return {
    ...storedPayload,
    ...formPayload
  };
}

async function callAutoIntake(payload) {
  const supabaseUrl = window.__env?.SUPABASE_URL;
  const supabaseKey = window.__env?.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/auto-intake`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      trackOpsEvent('client_api_failure', {
        endpoint: 'auto-intake',
        status: response.status
      }, { category: 'api', severity: 'error', http_status: response.status });
      throw new Error(`Auto intake failed: ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function trackAutoEvent(eventName, metadata = {}) {
  mirrorLegacySiteEvent(eventName, { category: 'auto', ...metadata });
  analytics.track(
    eventName,
    {
      session_id: getSessionId(),
      email: readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL) || metadata.email || null,
      ...metadata
    },
    {
      category: 'auto',
      funnel: 'auto',
      funnel_step: String(eventName).replace(/^auto_/, ''),
      email: metadata.email || readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL) || null,
      phone: metadata.phone || null
    }
  );
  mirrorLegacyAutoFunnel(eventName, metadata);
}

function trackUniqueAutoEvent(eventName, metadata = {}, key = '') {
  if (!shouldTrackUnique(eventName, key)) return;
  trackAutoEvent(eventName, metadata);
}

function fuelLabel(fuel) {
  return {
    hybrid: 'Hibrit',
    electric: 'Elektrikli',
    gasoline: 'Benzinli',
    diesel: 'Dizel'
  }[fuel] || fuel;
}

let autoLoadingStepTimer = null;

function renderLoading() {
  const container = document.getElementById('auto-results');
  if (!container) return;

  const steps = [
    'İhtiyaç profiliniz oluşturuluyor',
    'Uygun araç segmenti eşleştiriliyor',
    'Toplam sahip olma maliyeti hesaplanıyor',
    'Finansman ve kullanım riski modelleniyor',
    'Size en yakın seçenekler sıralanıyor'
  ];

  container.innerHTML = `
    <div class="ai-loading premium-loading auto-pre-result-panel" role="status" aria-live="polite" aria-busy="true">
      <div class="premium-loading-ring" aria-hidden="true">
        <div class="spinner"></div>
      </div>
      <p class="kicker">${escapeHtml(CONVERSION_COPY.auto.loadingKicker)}</p>
      <h3>${escapeHtml(CONVERSION_COPY.auto.loadingTitle)}</h3>
      <p class="loading-copy">${escapeHtml(CONVERSION_COPY.auto.loadingBody)}</p>
      <ul class="ai-loading-steps premium-loading-steps">
        ${steps.map((label, index) => `
          <li class="${index === 0 ? 'is-active' : ''}" data-loading-step="${index}">${escapeHtml(label)}</li>
        `).join('')}
      </ul>
      <p class="premium-loading-footnote">${escapeHtml(CONVERSION_COPY.auto.loadingFootnote)}</p>
    </div>
  `;

  if (autoLoadingStepTimer) clearInterval(autoLoadingStepTimer);
  const items = container.querySelectorAll('[data-loading-step]');
  let activeIndex = 0;
  autoLoadingStepTimer = window.setInterval(() => {
    activeIndex += 1;
    items.forEach((item, index) => {
      item.classList.toggle('is-done', index < activeIndex);
      item.classList.toggle('is-active', index === activeIndex);
    });
    if (activeIndex >= items.length - 1) {
      clearInterval(autoLoadingStepTimer);
      autoLoadingStepTimer = null;
    }
  }, 400);
}

function stopLoadingAnimation() {
  if (autoLoadingStepTimer) {
    clearInterval(autoLoadingStepTimer);
    autoLoadingStepTimer = null;
  }
}

async function updateLeadInterest(phone, interestType, vehicle = '', options = {}) {
  const email = readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL);
  const leadPayload = getCurrentLeadPayload();

  return await callAutoIntake({
    type: 'lead',
    email: email || null,
    phone,
    turnstile_token: options.turnstileToken || '',
    metadata: enrichLeadMetadata({
      session_id: getSessionId(),
      growth: getGrowthContext(),
      decision: {
        session_id: readDecisionSession().id,
        top_match_score: readDecisionSession().topMatchScore ?? null,
        confidence_tier: readDecisionSession().confidenceTier ?? null,
        segment_key: buildSegmentKey(leadPayload)
      },
      partner_match: computePartnerMatchScores({
        ...leadPayload,
        purchase_timeline: options.purchaseTimeline || leadPayload.purchase_timeline || '',
        financing_intent: options.financingIntent || leadPayload.financing_intent || leadPayload.loan || '',
        urgency: options.urgency || leadPayload.urgency || ''
      }).slice(0, 3)
    }),
    formData: {
      ...leadPayload,
      phone,
      contact_name: options.contactName || '',
      preferred_contact_time: options.preferredContactTime || '',
      city: options.city || leadPayload.city || '',
      district: options.district || leadPayload.district || '',
      privacy_consent: options.privacyConsent ? 'accepted' : '',
      marketing_consent: options.marketingConsent ? 'accepted' : '',
      interest_type: interestType,
      vehicle,
      vehicle_catalog_id: options.vehicleCatalogId || readSelectedVehicle()?.id || '',
      selection_confirmed_at: options.selectionConfirmedAt || readSelectedVehicle()?.confirmedAt || '',
      branch_intent: options.branchIntent || '',
      finance_bank: options.financeBank || '',
      finance_loan_amount: options.financeLoanAmount || '',
      finance_term: options.financeTerm || '',
      finance_monthly_payment: options.financeMonthlyPayment || '',
      finance_total_payment: options.financeTotalPayment || '',
      purchase_timeline: options.purchaseTimeline || leadPayload.purchase_timeline || '',
      financing_intent: options.financingIntent || leadPayload.financing_intent || leadPayload.loan || '',
      trade_in: options.tradeIn || leadPayload.trade_in || '',
      urgency: options.urgency || leadPayload.urgency || '',
      contact_preference: options.contactPreference || leadPayload.contact_preference || '',
      ...readAiCommentaryForLead()
    }
  });
}


const TURNSTILE_SITE_KEY = '0x4AAAAAADRgIOMcaKMMBndc';

async function getTurnstileToken() {
  const { loadTurnstileScript } = await import('../runtime/load-turnstile.js');
  await loadTurnstileScript();

  return new Promise((resolve) => {
    if (!window.turnstile || !TURNSTILE_SITE_KEY) {
      resolve('');
      return;
    }

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    let settled = false;
    const finish = (token = '') => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      container.remove();
      resolve(token || '');
    };

    const timeout = setTimeout(() => finish(''), 6000);

    try {
      const widgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        size: 'invisible',
        callback: (token) => finish(token),
        'error-callback': () => finish(''),
        'timeout-callback': () => finish('')
      });

      window.turnstile.execute(widgetId);
    } catch {
      finish('');
    }
  });
}


window.__istebulGetTurnstileToken = getTurnstileToken;
window.__istebulTurnstileSiteKey = TURNSTILE_SITE_KEY;

function calculateLoanPayment(amount, monthlyRate, term) {
  const principal = Number(amount || 0);
  const rate = Number(monthlyRate || 0) / 100;
  const months = Number(term || 48);

  if (!principal || !rate || !months) return 0;

  return Math.round((principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1));
}

function getStaticFinanceOffers(vehicle) {
  const loanAmount = Math.round(Number(vehicle?.price || 0) * 0.7);
  const term = 48;

  return [
    { provider: 'Garanti BBVA', rate: 3.19, term, loanAmount },
    { provider: 'Akbank', rate: 3.29, term, loanAmount },
    { provider: 'Yapı Kredi', rate: 3.35, term, loanAmount },
    { provider: 'TEB', rate: 3.39, term: 36, loanAmount },
    { provider: 'QNB', rate: 3.45, term: 36, loanAmount }
  ].map((offer) => {
    const monthly = calculateLoanPayment(offer.loanAmount, offer.rate, offer.term);
    return {
      ...offer,
      monthly,
      total: monthly * offer.term
    };
  }).sort((a, b) => a.monthly - b.monthly);
}

function openFinanceCompareModal(vehicleName = '') {
  analytics.track('finance_funnel_start', { vehicle: vehicleName || null }, {
    category: 'finance',
    funnel: 'finance',
    funnel_step: 'compare_modal_open'
  });
  trackAutoEvent('auto_finance_click', { vehicle: vehicleName, interest_type: 'finance' });
  enrollFinanceFollowUp({ vehicle: vehicleName, interest_type: 'finance' });

  const vehicle = (lastResults || []).find((item) => item.name === vehicleName) || lastResults?.[0] || {};
  const vehiclePrice = Number(vehicle.price || 0);
  const maxLoanAmount = Math.round(vehiclePrice * 0.8);
  const terms = [12, 24, 36, 48];
  const isLoggedIn = !!window.currentUser;

  const existing = document.getElementById('finance-compare-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'finance-compare-modal';
  modal.className = 'lead-modal finance-compare-modal';

  function buildOffers(principal, selectedTerm) {
    return [
      { provider: 'Garanti BBVA', rate: 3.19 },
      { provider: 'Akbank', rate: 3.29 },
      { provider: 'Yapı Kredi', rate: 3.35 },
      { provider: 'TEB', rate: 3.39 },
      { provider: 'QNB', rate: 3.45 }
    ].map((offer) => {
      const monthly = calculateLoanPayment(principal, offer.rate, selectedTerm);
      return { ...offer, term: selectedTerm, loanAmount: principal, monthly, total: monthly * selectedTerm };
    }).sort((a, b) => a.monthly - b.monthly);
  }

  function render(loanAmount = '', selectedTerm = 48) {
    const requestedLoan = Number(String(loanAmount ?? '').replace(/[^0-9]/g, '') || 0);
    const loanLimit = maxLoanAmount || vehiclePrice || 1600000;
    const principal = requestedLoan > 0
      ? Math.max(50000, Math.min(requestedLoan, loanLimit))
      : 0;
    const loanWasCapped = requestedLoan > loanLimit;
    const downPayment = principal > 0 ? Math.max(0, vehiclePrice - principal) : vehiclePrice;
    const offers = principal > 0 ? buildOffers(principal, selectedTerm) : [];
    const hasLoanInput = principal > 0;

    window.lastFinanceComparison = {
      vehicle: vehicle.name || vehicleName,
      vehiclePrice,
      loanAmount: principal,
      term: selectedTerm,
      offers
    };

    modal.innerHTML = `
      <div class="lead-modal-card finance-compare-card finance-configurator-card">
        <button type="button" class="lead-modal-close" aria-label="Kapat">×</button>

        <p class="kicker">Kredi karşılaştırması</p>
        <h3>${escapeHtml(vehicle.name || vehicleName || 'Araç')} için kişisel finansman simülasyonu</h3>
        <p class="lead-modal-muted">Kredi tutarını siz girersiniz. Minimum 50.000 TL; maksimum araç değerinin %80’i (${formatAmount(loanLimit)}).</p>

        <div class="finance-login-note">
          <strong>${isLoggedIn ? 'Karşılaştırmanız kaydedilmeye hazır.' : 'Kişisel karşılaştırmayı kaydetmek için giriş yapın.'}</strong>
          <span>${isLoggedIn ? 'Seçimleriniz profilinizde saklanabilir.' : 'Giriş yapmadan da tahmini simülasyonu görüntüleyebilirsiniz.'}</span>
        </div>

        <div class="finance-config-grid">
          <label>
            <span>Araç fiyatı</span>
            <strong>${formatAmount(vehiclePrice || 0)}</strong>
          </label>

          <label>
            <span>Kredi tutarı</span>
            <input
              id="finance-loan-amount"
              type="number"
              inputmode="numeric"
              min="50000"
              max="${loanLimit}"
              step="10000"
              value="${hasLoanInput ? principal : ''}"
              placeholder="Örn. ${loanLimit >= 500000 ? '500000' : '50000'}"
              aria-required="true"
            >
            ${loanWasCapped ? '<small class="finance-input-warning">Maksimum kredi limiti araç değerinin %80’i olarak uygulandı.</small>' : ''}
            ${!hasLoanInput ? '<small class="finance-input-hint">Banka karşılaştırması için tutarı girin.</small>' : ''}
          </label>

          <label>
            <span>Peşinat</span>
            <strong>${hasLoanInput ? formatAmount(downPayment) : 'Kredi tutarına göre hesaplanır'}</strong>
          </label>
        </div>

        <div class="finance-term-selector">
          ${terms.map((term) => `
            <button type="button" class="term-btn ${term === selectedTerm ? 'active' : ''}" data-term="${term}">
              ${term} ay
            </button>
          `).join('')}
        </div>

        <div class="finance-offer-table${hasLoanInput ? '' : ' finance-offer-table--empty'}">
          ${hasLoanInput ? offers.map((offer, index) => `
            <article class="finance-bank-row ${index === 0 ? 'best' : ''}">
              <div>
                <span class="bank-rank">${index === 0 ? 'En uygun' : 'Alternatif'}</span>
                <strong>${escapeHtml(offer.provider)}</strong>
                <small>%${offer.rate} aylık oran • ${offer.term} ay vade</small>
              </div>
              <div>
                <b>${formatAmount(offer.monthly)}</b>
                <small>tahmini aylık ödeme</small>
              </div>
              <div>
                <b>${formatAmount(offer.total)}</b>
                <small>toplam geri ödeme</small>
              </div>
              <button class="btn primary finance-prequal-btn" data-bank="${escapeHtml(offer.provider)}" data-vehicle="${escapeHtml(vehicle.name || vehicleName)}">
                Ön değerlendir
              </button>
            </article>
          `).join('') : `
            <p class="finance-offer-empty">Kredi tutarını girdikten sonra banka karşılaştırması ve tahmini ödemeler burada listelenir.</p>
          `}
        </div>

        <p class="finance-disclaimer">Bu ekran kredi tavsiyesi değil, tahmini karşılaştırma simülasyonudur.</p>
        ${!isProActive() ? renderContextualUpsellCard('premium_finance', 'auto_finance_modal') : ''}
      </div>
    `;

    modal.querySelector('.lead-modal-close')?.addEventListener('click', closeFinanceModal);

    const loanInput = modal.querySelector('#finance-loan-amount');
    loanInput?.addEventListener('input', (event) => {
      render(event.target.value, selectedTerm);
    });

    modal.querySelectorAll('.term-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const currentLoan = loanInput?.value ?? '';
        render(currentLoan, Number(button.dataset.term || selectedTerm));
      });
    });

    modal.querySelectorAll('.finance-prequal-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const selectedVehicle = button.getAttribute('data-vehicle') || vehicleName;
        closeFinanceModal();
        window.lastFinanceLeadContext = {
          bank: button.dataset.bank,
          vehicle: selectedVehicle,
          comparison: window.lastFinanceComparison
        };
        sessionStorage.setItem(STORAGE_KEYS.AUTO_FINANCE_LEAD_CONTEXT, JSON.stringify(window.lastFinanceLeadContext));
        captureFinancingAccepted({
          vehicle: selectedVehicle,
          stage: 'prequal_click',
          form: readForm(document.getElementById('auto-form')),
          properties: { bank: button.dataset.bank || null }
        });
        openLeadModal('finance_review', selectedVehicle);
      });
    });
  }

  const closeFinanceModal = () => {
    modal.remove();
    if (!document.querySelector('.lead-modal, .revenue-paywall')) {
      document.body.classList.remove('modal-open');
    }
  };

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeFinanceModal();
  });

  document.body.classList.add('modal-open');
  document.body.appendChild(modal);
  render();
  bindContextualUpsell(modal);
}

function markLeadAbandonPending(meta = {}) {
  writeStorageRaw(
    STORAGE_KEYS.LEAD_ABANDON_PENDING,
    JSON.stringify({ at: Date.now(), ...meta })
  );
}

function clearLeadAbandonPending() {
  try {
    localStorage.removeItem(STORAGE_KEYS.LEAD_ABANDON_PENDING);
  } catch {}
}

function openLeadModal(type, vehicle = '', leadOptions = {}) {
  const selected = readSelectedVehicle();
  vehicle = vehicle || selected?.name || '';
  trackAutoEvent('auto_modal_open', { interest_type: type, vehicle });
  markLeadAbandonPending({ interest_type: type, vehicle });

  const existing = document.getElementById('lead-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'lead-modal';
  modal.className = 'lead-modal';

  const flow = {
    finance_review: {
      kicker: 'Finansman ön değerlendirme',
      title: 'Finansman seçeneklerinizi karşılaştıralım',
      description: 'Partner kurumlar üzerinden oran, vade ve ön onay seçenekleri için talebinizi alalım.',
      submit: 'Finansman ön değerlendirmesini başlat',
      success: 'Finansman ön değerlendirme talebiniz alındı'
    },
    finance: {
      kicker: 'Finansman ön değerlendirme',
      title: 'Finansman seçeneklerinizi karşılaştıralım',
      description: 'Partner kurumlar üzerinden oran, vade ve ön onay seçenekleri için talebinizi alalım.',
      submit: 'Finansman ön değerlendirmesini başlat',
      success: 'Finansman ön değerlendirme talebiniz alındı'
    },
    dealer_match: {
      kicker: 'Partner eşleşmesi',
      title: 'Size uygun partner eşleşmesini hazırlayalım',
      description: 'Bölgenizdeki doğrulanmış partner ağı üzerinden teklif hazırlığı başlatılabilir.',
      submit: 'Partner eşleşmesini başlat',
      success: 'Partner eşleşmesi talebiniz alındı'
    },
    vehicle_offer: {
      kicker: 'Özel araç teklifi',
      title: 'Size özel teklif hazırlayalım',
      description: 'Araç profilinize göre teklif, bayi ve finansman seçenekleri birlikte değerlendirilebilir.',
      submit: 'Teklif sürecini başlat',
      success: 'Teklif talebiniz alındı'
    }
  }[type] || {
    kicker: 'Uzman değerlendirme',
    title: 'Uzman ekibimiz sizinle iletişime geçsin',
    description: 'Analiz sonucunuza göre en uygun seçenekleri birlikte değerlendirelim.',
    submit: 'Uzman değerlendirmesini başlat',
    success: 'Uzman değerlendirme talebiniz alındı'
  };

  const closeModal = () => {
    modal.remove();
    if (!document.querySelector('.lead-modal, .revenue-paywall')) {
      document.body.classList.remove('modal-open');
    }
  };

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  function renderLeadForm() {
    modal.innerHTML = `
      <div class="lead-modal-card premium-lead-modal">
        <button type="button" class="lead-modal-close" aria-label="Kapat">×</button>

        <div class="premium-lead-hero">
          <p class="kicker">${escapeHtml(flow.kicker)}</p>
          <h3>${escapeHtml(flow.title)}</h3>
          <p>${escapeHtml(flow.description)}</p>
        </div>
        <div class="premium-lead-points">
          <span>✓ Doğrulanmış partner ağı</span>
          <span>✓ Finansman ön değerlendirme</span>
          <span>✓ Hızlı geri dönüş</span>
          <span>✓ Zorunlu satın alma yok</span>
        </div>
        <p class="lead-modal-muted">Bilgileriniz KVKK kapsamında işlenir.</p>

        <form id="phone-lead-form" data-enterprise-form>
          <input name="vehicle" type="hidden" value="${escapeHtml(vehicle)}">
          <div class="ib-lead-field">
            <label for="lead-name">Ad Soyad</label>
            <input id="lead-name" name="name" type="text" required autocomplete="name" placeholder="Adınız Soyadınız">
          </div>
          <div class="ib-lead-field">
            <label for="lead-phone">Telefon</label>
            <input id="lead-phone" name="phone" type="tel" required autocomplete="tel" placeholder="05xx xxx xx xx">
          </div>
          <div class="ib-lead-field">
            <label for="lead-email">E-posta <span class="text-muted-sm">(opsiyonel)</span></label>
            <input id="lead-email" name="email" type="email" autocomplete="email" placeholder="ornek@mail.com">
          </div>
          <div class="ib-lead-field">
            <label for="lead-city">Şehir</label>
            <input id="lead-city" name="city" type="text" autocomplete="address-level2" placeholder="İl">
          </div>

          <select name="interest">
            <option value="${escapeHtml(type)}">${escapeHtml(flow.kicker)}</option>
            <option value="vehicle_offer">Araç teklifi</option>
            <option value="finance_review">Finansman</option>
            <option value="dealer_match">Partner eşleşmesi</option>
            <option value="expert_consultation">Uzman görüşmesi</option>
          </select>

          <div class="ib-lead-qualification-grid">
            <div class="ib-lead-field">
              <label for="lead-timeline">Satın alma zamanı</label>
              <select id="lead-timeline" name="purchase_timeline">
                <option value="">Seçiniz</option>
                <option value="0-30">0–30 gün</option>
                <option value="1-3">1–3 ay</option>
                <option value="3-6">3–6 ay</option>
                <option value="6+">6 ay+</option>
              </select>
            </div>
            <div class="ib-lead-field">
              <label for="lead-trade-in">Takas var mı?</label>
              <select id="lead-trade-in" name="trade_in">
                <option value="">Belirtmek istemiyorum</option>
                <option value="yes">Evet</option>
                <option value="no">Hayır</option>
              </select>
            </div>
            <div class="ib-lead-field">
              <label for="lead-urgency">Aciliyet</label>
              <select id="lead-urgency" name="urgency">
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="low">Düşük</option>
              </select>
            </div>
            <div class="ib-lead-field">
              <label for="lead-contact-pref">İletişim tercihi</label>
              <select id="lead-contact-pref" name="contact_preference">
                <option value="phone">Telefon</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-posta</option>
              </select>
            </div>
          </div>

          <label class="lead-consent">
            <input name="privacy_consent" type="checkbox" value="accepted" required>
            <span>
              <a href="/kvkk.html" target="_blank" rel="noopener">KVKK</a>,
              <a href="/gizlilik.html" target="_blank" rel="noopener">Gizlilik Politikası</a> ve uygun partnerlerle iletişim amacıyla paylaşım metnini kabul ediyorum.
            </span>
          </label>

          <label class="lead-consent lead-consent-optional">
            <input name="marketing_consent" type="checkbox" value="accepted">
            <span>Kampanya ve ürün güncellemelerini e-posta ile almak istiyorum (isteğe bağlı).</span>
          </label>

          <button class="btn primary" type="submit">${escapeHtml(flow.submit)}</button>
          <button class="btn secondary" type="button" id="cancel-lead-modal">Vazgeç</button>
        </form>
      </div>
    `;

    modal.querySelector('.lead-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('cancel-lead-modal')?.addEventListener('click', closeModal);

    let leadSubmitting = false;

    document.getElementById('phone-lead-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (leadSubmitting) return;
      leadSubmitting = true;

      const submitButton = event.currentTarget.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Talebiniz güvenli şekilde gönderiliyor...';
      }

      const form = new FormData(event.currentTarget);
      const phone = form.get('phone');
      const contactName = form.get('name') || '';
      const selectedVehicle = form.get('vehicle') || vehicle;
      const selectedInterest = form.get('interest') || type;
      const city = String(form.get('city') || '').trim();
      const privacyConsent = form.get('privacy_consent') === 'accepted';
      const marketingConsent = form.get('marketing_consent') === 'accepted';

      if (form.get('email')) {
        writeStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL, form.get('email'));
      }

      const turnstileToken = await getTurnstileToken();

      try {
        const financeContext = window.lastFinanceLeadContext
          || safeJsonParse(sessionStorage.getItem(STORAGE_KEYS.AUTO_FINANCE_LEAD_CONTEXT), {});
        const financeComparison = financeContext.comparison || {};
        const bestFinanceOffer = Array.isArray(financeComparison.offers)
          ? financeComparison.offers.find((offer) => offer.provider === financeContext.bank) || financeComparison.offers[0]
          : null;

        const leadForm = readForm(event.currentTarget);
        await updateLeadInterest(phone, selectedInterest, selectedVehicle, {
          turnstileToken,
          contactName,
          city,
          privacyConsent,
          marketingConsent,
          purchaseTimeline: leadForm.purchase_timeline || '',
          financingIntent: leadForm.financing_intent || getCurrentLeadPayload().loan || '',
          tradeIn: leadForm.trade_in || '',
          urgency: leadForm.urgency || '',
          contactPreference: leadForm.contact_preference || '',
          financeBank: financeContext.bank || '',
          financeLoanAmount: financeComparison.loanAmount || '',
          financeTerm: financeComparison.term || '',
          financeMonthlyPayment: bestFinanceOffer?.monthly || '',
          financeTotalPayment: bestFinanceOffer?.total || '',
          branchIntent: leadOptions.branchIntent || '',
          vehicleCatalogId: leadOptions.vehicleCatalogId || selected?.id || '',
          selectionConfirmedAt: leadOptions.selectionConfirmedAt || selected?.confirmedAt || ''
        });

        renderStep3();
      } catch {
        leadSubmitting = false;
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = flow.submit;
        }
        renderError();
      }
    });
  }

  function renderStep3() {
    clearLeadAbandonPending();
    trackGrowthFunnel(GROWTH_FUNNEL_EVENTS.LEAD_SUBMIT, { vehicle, interest: type }, {
      dedupeKey: 'lead_success',
      funnel: 'auto'
    });
    trackPaidFunnelStep('lead_submit', { vehicle, interest: type });
    sendServerPaidConversion('lead_submit', {
      vehicle,
      interest: type,
      email: readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL) || null
    });
    try {
      sessionStorage.removeItem(ONBOARDING_STARTED_KEY);
    } catch {
      /* ignore */
    }
    if (getStoredReferralCode()) {
      trackGrowth('growth_referral_convert', { vehicle }, {
        funnel: 'referral',
        funnel_step: 'lead_success'
      });
    }

    const financeContext = window.lastFinanceLeadContext || {};
    const financeComparison = financeContext.comparison || {};
    const financeMeta = financeContext.bank && financeComparison.loanAmount
      ? `${financeContext.bank} • ${formatAmount(financeComparison.loanAmount)} • ${financeComparison.term} ay`
      : '';

    modal.innerHTML = `
      <div class="lead-modal-card premium-lead-modal lead-success-modal">
        <button type="button" class="lead-modal-close" aria-label="Kapat">×</button>

        <p class="kicker">Talep alındı</p>
        <h3>${escapeHtml(flow.success)}</h3>
        <p>${financeMeta
          ? 'Seçtiğiniz finansman simülasyonu partner değerlendirmesine iletildi.'
          : 'Ekibimiz uygun teklif ve finansman seçenekleriyle sizinle iletişime geçecek.'}</p>

        ${financeMeta ? `
          <div class="finance-selected-summary">
            <strong>Seçilen simülasyon</strong>
            <span>${escapeHtml(financeMeta)}</span>
          </div>
        ` : ''}

        <div class="premium-lead-points">
          <span>✓ Talep güvenli şekilde kaydedildi</span>
          <span>✓ Partner ağı kontrol edilecek</span>
          <span>✓ En kısa sürede dönüş yapılacak</span>
        </div>

        ${renderReferralSharePanel({
          email: readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL) || '',
          title: 'Arkadaşınıza önerin',
          compact: false
        })}

        <div id="auto-partner-feedback-root" class="auto-moat-mount"></div>

        <div class="premium-lead-actions">
          <button class="btn primary" id="close-success-lead-modal">Tamam</button>
        </div>
      </div>
    `;

    mountProductFeedback(document.getElementById('auto-partner-feedback-root'), {
      surface: 'partner_post',
      form: readForm(document.getElementById('auto-form')),
      matchScore: readDecisionSession().topMatchScore,
      confidenceTier: readDecisionSession().confidenceTier
    });

    bindReferralShare(modal);
    modal.querySelector('.lead-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('close-success-lead-modal')?.addEventListener('click', closeModal);
  }

  function renderError() {
    modal.innerHTML = `
      <div class="lead-modal-card premium-lead-modal">
        <button type="button" class="lead-modal-close" aria-label="Kapat">×</button>

        <p class="kicker">Bağlantı sorunu</p>
        <h3>Talebiniz gönderilemedi</h3>
        <p>Lütfen birkaç saniye sonra tekrar deneyin.</p>

        <div class="premium-lead-actions">
          <button class="btn primary" id="retry-lead-submit">Tekrar dene</button>
          <button class="btn secondary" id="close-error-lead-modal">Kapat</button>
        </div>
      </div>
    `;

    modal.querySelector('.lead-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('retry-lead-submit')?.addEventListener('click', renderLeadForm);
    document.getElementById('close-error-lead-modal')?.addEventListener('click', closeModal);
  }

  document.body.classList.add('modal-open');
  document.body.appendChild(modal);
  renderLeadForm();
}


function renderAutoConfidenceBadge(meta) {
  if (!meta) return '';
  const tierClass =
    meta.tier === 'high'
      ? 'confidence-tier-high'
      : meta.tier === 'medium'
        ? 'confidence-tier-medium'
        : 'confidence-tier-review';

  return `
    <div class="auto-confidence-badge ${tierClass}" role="note" aria-label="Veri güven bandı açıklaması">
      <span class="auto-confidence-kicker">Veri güven bandı · skor değil</span>
      <strong>${escapeHtml(meta.label || 'Değerlendiriliyor')}</strong>
      ${renderConfidenceSemanticsPanel(meta)}
      <small class="auto-confidence-disclaimer">${escapeHtml(meta.disclaimer || 'Metodolojik destek; kesin sonuç değildir.')}</small>
    </div>`;
}

function renderAutoScoreBreakdown(vehicle) {
  const transparency = vehicle?.scoringTransparency;
  if (transparency?.factors?.length) {
    return renderScoringTransparencyPanel(transparency);
  }

  const breakdown = Array.isArray(vehicle) ? vehicle : vehicle?.scoreBreakdown || [];
  if (!breakdown.length) return '';

  return `
    <details class="auto-score-breakdown">
      <summary>Skor nasıl hesaplandı?</summary>
      <ul>
        ${breakdown.slice(0, 6).map((factor) => `
          <li class="${factor.positive ? 'positive' : 'negative'}">
            <span>${escapeHtml(factor.label)}</span>
            <strong>${escapeHtml(factor.status)} ${factor.delta > 0 ? '+' : ''}${factor.delta}</strong>
          </li>
        `).join('')}
      </ul>
    </details>`;
}

function renderAutoMethodologyStrip() {
  const panel = buildMethodologyPanel();
  return `
    <section class="auto-methodology-strip" aria-label="Karar metodolojisi">
      <h4>${escapeHtml(panel.title)}</h4>
      <ol>${panel.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
      <p class="auto-methodology-limits">${escapeHtml(panel.limits.join(' '))}</p>
    </section>`;
}

async function fetchAiStructuredCommentary(results, formData = {}, refinement = '', options = {}) {
  const pro = Boolean(options.pro);
  const deterministic = buildDeterministicDecisionCommentary(results, formData);

  if (!hasAiNarrationBudget({ pro })) {
    return {
      commentary: deterministic,
      synthesis: getAiNarrationBudgetMessage({ pro }) || buildDeterministicSynthesis(buildExplanationBundle(results, formData)),
      source: 'rules',
      usedAi: false
    };
  }
  if (!canCallAiNarration({ pro })) {
    return {
      commentary: deterministic,
      synthesis: getAiNarrationBudgetMessage({ pro }) || buildDeterministicSynthesis(buildExplanationBundle(results, formData)),
      source: 'rules',
      usedAi: false
    };
  }

  const bundle = buildExplanationBundle(results, formData);
  const prompt = buildCommentaryPrompt(results, formData, bundle, refinement);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_COMMENTARY_TIMEOUT_MS);

  try {
    const res = await fetch('/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, format: 'structured_commentary' }),
      signal: controller.signal
    });

    if (!res.ok) {
      return { commentary: deterministic, synthesis: deterministic.executive_summary, source: 'rules', usedAi: false };
    }

    const data = await res.json();
    const parsed = parseStructuredCommentary(data.result || '');
    const { data: merged, source } = mergeCommentary(parsed, deterministic);
    const synthesis = sanitizeAiNarrative(
      merged.executive_summary || '',
      SCALE_LIMITS.aiProxy.maxNarrativeChars
    );

    return {
      commentary: merged,
      synthesis: synthesis || deterministic.executive_summary,
      source,
      usedAi: source === 'ai'
    };
  } catch {
    return {
      commentary: deterministic,
      synthesis: deterministic.executive_summary,
      source: 'rules',
      usedAi: false
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function persistAiCommentaryForLead(commentary) {
  if (!commentary?.executive_summary) return;
  try {
    const summary = String(commentary.executive_summary).slice(0, 480);
    const confidence = String(commentary.confidence_level || '').slice(0, 24);
    sessionStorage.setItem(
      AI_COMMENTARY_STORAGE_KEY,
      JSON.stringify({ summary, confidence, at: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

function readAiCommentaryForLead() {
  try {
    const raw = sessionStorage.getItem(AI_COMMENTARY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      ai_summary: parsed.summary ? String(parsed.summary).slice(0, 480) : null,
      ai_confidence: parsed.confidence ? String(parsed.confidence).slice(0, 24) : null
    };
  } catch {
    return {};
  }
}


function getFilteredAutoResults(){
  let items = [...allResults];

  if (resultFilters.fuel !== 'all') {
    items = items.filter(vehicle => vehicle.fuel === resultFilters.fuel);
  }

  if (resultFilters.body !== 'all') {
    items = items.filter(vehicle => vehicle.body === resultFilters.body);
  }

  items.sort((a, b) => {
    if (resultFilters.sort === 'price_asc') return Number(a.price || 0) - Number(b.price || 0);
    if (resultFilters.sort === 'family') return Number(b.family || 0) - Number(a.family || 0);
    if (resultFilters.sort === 'city') return Number(b.city || 0) - Number(a.city || 0);
    if (resultFilters.sort === 'long') return Number(b.long || 0) - Number(a.long || 0);
    return Number(b.score || 0) - Number(a.score || 0);
  });

  return items;
}

function renderFilteredAutoResults(){
  const filtered = getFilteredAutoResults();
  lastResults = filtered;
  renderResults(filtered);
}



function renderOfferSkeleton(vehicleName) {
  return `
    <section class="dealer-offer-strip" data-offers-for="${escapeHtml(vehicleName)}">
      <div class="dealer-offer-header">
        <div>
          <strong>isteBul Verified Dealer Network</strong>
          <span>Bölgenizde uygun partner ve teklif seçenekleri kontrol ediliyor...</span>
        </div>
      </div>
    </section>
  `;
}

function renderDealerOffers(offers, vehicle, formData) {
  const city = String(formData.city || '').trim();

  if (!offers.length) {
    return `
      <div class="dealer-offer-header">
        <div>
          <strong>isteBul Verified Network</strong>
          <span>${city ? `${escapeHtml(city)} içinde` : 'Seçtiğiniz bölgede'} bu modele uygun doğrulanmış satıcı eşleşmesi hazırlanabilir.</span>
        </div>
        <button class="btn secondary auto-interest-btn" data-interest="dealer_match" data-vehicle="${escapeHtml(vehicle.name)}">
          Size özel teklif iste
        </button>
      </div>
      <div class="dealer-offer-list">
        <article class="dealer-offer-card dealer-offer-placeholder verified-network-card">
          <div class="verified-network-main">
            <span class="verified-kicker">PARTNER NETWORK</span>
            <strong>Ön doğrulanmış partner eşleşmesi</strong>
            <span>${city ? escapeHtml(city) : 'Seçilen bölge'} ${formData.district ? ` / ${escapeHtml(formData.district)}` : ''}</span>
            <small>Uygun bayi, teklif aralığı ve finansman ön değerlendirmesi talebiniz sonrası hazırlanır.</small>
          </div>
          <div class="verified-network-points">
            <span>Doğrulanmış bayi ağı</span>
            <span>Finansman ön değerlendirme</span>
            <span>Hızlı geri dönüş</span>
          </div>
          <div class="dealer-offer-price">
            <strong>Özel teklif</strong>
            <button class="btn primary auto-interest-btn" data-interest="dealer_match" data-vehicle="${escapeHtml(vehicle.name)}">
              Eşleşme iste
            </button>
          </div>
        </article>
      </div>
    `;
  }

  return `
    <div class="dealer-offer-header">
      <div>
        <strong>isteBul Verified Dealer Network</strong>
        <span>${offers.length} doğrulanmış teklif seçeneği bulundu${city ? ` • ${escapeHtml(city)}` : ''}</span>
      </div>
    </div>
    <div class="dealer-offer-list">
      ${offers.map((offer) => `
        <article class="dealer-offer-card">
          ${offer.image_url ? `<img src="${escapeHtml(offer.image_url)}" alt="${escapeHtml(offer.title)}" loading="lazy" decoding="async">` : ''}
          <div>
            <strong>${escapeHtml(offer.title || vehicle.name)}</strong>
            <span>${escapeHtml(offer.dealer_name || 'Satıcı')} • ${escapeHtml([offer.dealer_city, offer.dealer_district].filter(Boolean).join(' / '))}</span>
            <small>${offer.km ? `${formatCount(offer.km)} km • ` : ''}${escapeHtml(offer.color || 'Renk bilgisi yok')}</small>
          </div>
          <div class="dealer-offer-price">
            <strong>${offer.price ? `${formatAmount(offer.price)}` : 'Fiyat sorunuz'}</strong>
            ${offer.listing_url ? `<a href="${escapeHtml(offer.listing_url)}" target="_blank" rel="noopener">Kaynağı görüntüle</a>` : ''}
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

async function hydrateDealerOffers(results, formData) {
  await Promise.all(results.map(async (vehicle) => {
    const container = document.querySelector(`[data-offers-for="${CSS.escape(vehicle.name)}"]`);
    if (!container) return;

    const offers = await getDealerOffers(vehicle, formData);
    container.innerHTML = renderDealerOffers(offers, vehicle, formData);
  }));
}

function buildEconomicVerdict(vehicle) {
  const total = Number(vehicle.costs?.total || 0);
  const depreciation = Number(vehicle.costs?.depreciation || 0);

  if (vehicle.score >= 90 && depreciation < total * 0.18) {
    return 'Ekonomik olarak güçlü karar. Kullanım uyumu ve toplam sahip olma maliyeti dengeli.';
  }

  if (depreciation > total * 0.22) {
    return 'Toplam maliyette değer kaybı etkisi yüksek olabilir. Sahiplik süresi önemli.';
  }

  if (vehicle.costs?.fuel > vehicle.costs?.maintenance) {
    return 'Operasyonel maliyet ağırlıklı bir profil. Kullanım yoğunluğunuz kritik.';
  }

  return 'Genel maliyet profili dengeli. Nihai karar için finansman ve teklif karşılaştırması önerilir.';
}

function renderResults(results) {
  const root = document.getElementById('auto-results');

  if (!Array.isArray(results) || !results.length) {
    root.innerHTML = `
      <article class="premium-result-card auto-empty-state">
        <i data-lucide="search-x" class="empty-state-icon" aria-hidden="true"></i>
        <p class="kicker">Sonuç bulunamadı</p>
        <h3>Bu kriterlerle güvenilir bir öneri oluşturamadık.</h3>
        <p>Aralığı biraz genişletin veya bütçe/yakıt tercihlerini güncelleyerek daha güçlü eşleşmeler görün.</p>
        <div class="empty-state-actions">
          <a class="btn primary" href="#auto-wizard">Kriterleri güncelle</a>
          <button class="btn secondary" type="button" data-reset-auto-filters>Filtreleri sıfırla</button>
        </div>
      </article>
    `;
    root.querySelector('[data-reset-auto-filters]')?.addEventListener('click', () => {
      resultFilters = { fuel: 'all', body: 'all', sort: 'score' };
      renderFilteredAutoResults();
    });
    renderDecisionStepper();
    mountAutoPartnerNextSteps();
    return;
  }

  const formData = form ? readForm(form) : {};
  const pro = isProActive();
  const displayLimit = pro ? results.length : Math.min(FREE_LIMITS.maxAutoResultsPreview, results.length);
  const displayResults = results.slice(0, displayLimit);

  const rankNote = results[0]?.rankExplanation?.summary;
  const rankIntelPanel = renderLeaderRankPanel(results[0]?.rankIntelligence);
  const totalCount = allResults.length || results.length;

  root.innerHTML = `
    <div class="auto-results-layout">
      <div class="auto-results-main">
    ${renderResultsLeaderSummary(results[0], { displayCount: displayResults.length, totalCount })}

    ${renderDecisionDashboard(results[0], formData)}

    ${renderAutoFilterToolbar(displayResults, results, pro)}

    ${renderComparisonMatrix(displayResults, formData, escapeHtml)}

    ${rankIntelPanel || ''}

    ${renderScenarioCardsHtml(displayResults.slice(0, 3), formData)}

    ${renderVehicleSelectionGate(displayResults)}

    <div class="auto-results-cards-detailed" aria-label="Detaylı model analizleri">
  ` + displayResults.map((vehicle, index) => {
    const monthlyImpact = Math.round((Number(vehicle.costs.total || 0) / 12) / 100) * 100;
    const rankLabel = index === 0
      ? 'Genel uyum lideri'
      : index === 1
        ? 'Maliyet odaklı alternatif'
        : 'Alternatif senaryo';

    const innerCard = `
    <article class="auto-market-card premium-result-card conversion-result-card"${index === 0 ? ' id="auto-results-leader-card"' : ''}>
      <div class="auto-market-media">
        <div class="auto-market-rank">${rankLabel}</div>
        <div class="auto-market-image">
          ${renderVehicleImageHtml(vehicle, escapeHtml, { className: 'auto-market-image__img', width: 640, height: 360 })}
        </div>
      </div>

      <div class="auto-market-main">
        <div class="auto-market-title-row">
          <div>
            <h3>${escapeHtml(vehicle.name)}</h3>
            <p class="result-summary">
              ${vehicle.score >= 85
                ? 'Profiliniz için güçlü eşleşme. Toplam maliyet, kullanım uyumu ve finansman açısından öne çıkıyor.'
                : 'Profilinize uygun alternatif. Kullanım ve bütçe dengenize göre değerlendirildi.'}
            </p>
          </div>
          ${renderAutoConfidenceBadge(vehicle.confidenceMeta)}
        </div>

        <div class="auto-market-tags">
          <span>Kural tabanlı skor</span>
          <span>12 ay TCO</span>
          <span>${vehicle.costs?.source === 'truth' ? 'Doğrulanmış maliyet' : 'Tahmini maliyet'}</span>
        </div>

        <div class="auto-market-insights">
          <div class="analysis-box">
            <strong>Güçlü taraflar</strong>
            <ul>${vehicle.reasons.slice(0, 3).map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
          </div>

          <div class="risk-box">
            <strong>Dikkat noktaları</strong>
            <ul>${vehicle.risks.slice(0, 2).map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
          </div>
        </div>

        ${renderDecisionInsightPanels(vehicle, formData, { alternatives: displayResults, rank: index }, escapeHtml, { compact: true })}

        ${vehicle.recommendationIntelligence ? renderRecommendationIntelligencePanel(vehicle.recommendationIntelligence, escapeHtml) : ''}

        ${renderOwnershipBreakdown(vehicle, formData, escapeHtml)}
        ${renderHowCalculatedPanel(vehicle, escapeHtml)}

        <div class="analysis-box auto-economic-verdict">
          <strong>Ekonomik değerlendirme</strong>
          <p>${escapeHtml(buildEconomicVerdict(vehicle))}</p>
          <small>Kural tabanlı özet; bağlayıcı teklif veya kredi onayı değildir.</small>
        </div>

        ${renderAutoScoreBreakdown(vehicle)}
        ${index > 0 && vehicle.runnerContrast ? renderRunnerRankContrast(vehicle.runnerContrast) : ''}
      </div>

      <aside class="auto-market-decision">
        <div class="auto-market-score">
          <strong>${escapeHtml(formatScore(vehicle.score))}</strong>
          <span>/100 uyum skoru</span>
          <small class="auto-score-hint">Metodolojik sıralama; kesin sonuç değildir</small>
        </div>

        <div class="monthly-impact">
          <span>Aylık bütçe etkisi</span>
          <strong>${formatAmount(monthlyImpact)}</strong>
        </div>

        <div class="cost auto-market-cost">
          <p><strong>12 aylık işletme + finansman</strong></p>
          <p>${formatAmount(vehicle.costs?.ownership?.totals?.months12 || vehicle.costs.total)}</p>
          <small>
            Yakıt ${formatAmount(vehicle.costs.fuel)} •
            Sigorta ${formatAmount(vehicle.costs.insurance)} •
            Kasko ${formatAmount(vehicle.costs.kasko || 0)} •
            Bakım ${formatAmount(vehicle.costs.maintenance)} •
            MTV ${formatAmount(vehicle.costs.tax || 0)} •
            Değer kaybı ${formatAmount(vehicle.costs.depreciation || 0)}
          </small>
        </div>

        ${vehicle.score >= 85 ? `
          <div class="auto-hot-banner finance-comparison-widget">
            <span class="finance-kicker">FİNANSMAN SİMÜLASYONU</span>
            <strong>Örnek senaryo — banka onayı ayrıdır</strong>
            <div class="finance-widget-grid">
              <span><b>Örnek</b><small>oran bandı</small></span>
              <span><b>36–48 ay</b><small>vade aralığı</small></span>
              <span><b>Partner</b><small>kurum eşleşmesi</small></span>
            </div>
            <p class="finance-widget-disclaimer">Gösterilen oranlar örnektir; gerçek teklif kredi notu ve bankaya göre değişir.</p>
            <button class="btn secondary finance-compare-trigger" data-vehicle="${escapeHtml(vehicle.name)}">
              Finansmanı karşılaştır
            </button>
          </div>
        ` : ''}
      </aside>

      ${renderOfferSkeleton(vehicle.name)}

      <div class="auto-market-actions auto-market-actions--tiered">
        <div class="auto-market-actions-core">
          <button class="btn primary auto-interest-btn" data-interest="vehicle_offer" data-vehicle="${escapeHtml(vehicle.name)}">
            Teklif sürecini başlat
          </button>
          <button class="btn secondary auto-compare-btn" data-result-index="${index}" data-vehicle="${escapeHtml(vehicle.name)}" data-track-compare="1">
            Karşılaştır
          </button>
        </div>
        <details class="auto-market-more-actions">
          <summary>Diğer işlemler</summary>
          <div class="auto-market-more-actions-grid">
            <button class="btn secondary auto-shortlist-btn" data-result-index="${index}" data-vehicle="${escapeHtml(vehicle.name)}">
              Shortlist'e ekle
            </button>
            <button class="btn secondary auto-whatsapp-btn" data-vehicle="${escapeHtml(vehicle.name)}">
              Uzmanla görüş
            </button>
            <button class="btn secondary finance-compare-trigger" data-vehicle="${escapeHtml(vehicle.name)}">
              Finansman etkisi
            </button>
          </div>
        </details>
        <p class="cta-microcopy">Ücretsiz ön değerlendirme • zorunlu satın alma yok</p>
      </div>

      ${renderProviderCtaStrip({ vehicleName: vehicle.name, formData }, escapeHtml)}
    </article>
  `;

    const cardHtml = index < 3
      ? `<details class="auto-rec-detail-panel" id="auto-rec-detail-${index}">
          <summary class="auto-rec-detail-summary">Detaylı analiz — ${escapeHtml(vehicle.name)}</summary>
          ${innerCard}
        </details>`
      : innerCard;

    if (index === 0 && !pro) {
      return cardHtml + renderAutoUpgradeStrip('revenue-upgrade-banner--after-leader');
    }
    return cardHtml;
  }).join('') + `
    </div>

    ${renderResultsDeepDive({
      results,
      topResult: results[0],
      formData,
      rankNote,
      rankIntelPanel: ''
    })}

    <div id="auto-moat-outcome-root" class="auto-moat-mount"></div>
    <div id="auto-moat-feedback-root" class="auto-moat-mount"></div>

    ${renderAiExplanationExperience(buildExplanationBundle(results, formData), {
      pro,
      structuredCommentaryHtml: renderStructuredCommentaryPanel(
        buildDeterministicDecisionCommentary(results, formData),
        { state: 'loading', source: 'rules' }
      )
    })}

    ${!pro ? renderContextualUpsellCard('advanced_ai_summary', 'auto_results') : ''}
    ${!pro ? renderUpsellFeatureChips('auto_results') : ''}
    ${renderReferralSharePanel({ compact: true })}
      </div>
      ${renderResultsSidebar(results[0], displayResults)}
    </div>
  `;

  // Sprint 1: Decision Results V2 panel (controlled overlay, non-breaking).
  const main = root.querySelector('.auto-results-main') || root;
  void mountAutoResultsV2({
    mountNode: main,
    topResult: results[0],
    results,
    formData,
    track: (eventName, metadata) => trackAutoEvent(eventName, metadata)
  });

  renderDecisionStepper();
  mountAutoPartnerNextSteps();
  bindVehicleSelectionGate(root);
  bindDecisionCardEvents(root, displayResults.slice(0, 3));

  root.querySelectorAll('[data-auto-scroll-selection]').forEach((button) => {
    button.addEventListener('click', scrollToVehicleSelection);
  });

  root.querySelectorAll('[data-auto-open-detail]').forEach((button) => {
    button.addEventListener('click', () => {
      const idx = button.getAttribute('data-auto-open-detail');
      const panel = document.getElementById(`auto-rec-detail-${idx}`);
      if (panel && 'open' in panel) panel.open = true;
      panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  bindReferralShare(root);
  bindContextualUpsell(root);
  bindUpsellFeatureChips(root);

  const topResult = results[0];
  updateDecisionSession({
    topMatchScore: topResult?.score ?? null,
    confidenceTier: topResult?.confidence?.tier ?? null,
    segmentKey: buildSegmentKey(formData)
  });

  mountOutcomeIntelligence(document.getElementById('auto-moat-outcome-root'), formData);
  const feedbackRoot = document.getElementById('auto-moat-feedback-root');
  if (!maybeMountEmailProductFeedback(feedbackRoot, {
    form: formData,
    matchScore: topResult?.score,
    confidenceTier: topResult?.confidence?.tier
  })) {
    mountProductFeedback(feedbackRoot, {
      surface: 'auto_results',
      form: formData,
      matchScore: topResult?.score,
      confidenceTier: topResult?.confidence?.tier
    });
  }

  root.querySelectorAll('[data-auto-filter]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const key = event.target.dataset.autoFilter;
      if (!key) return;
      resultFilters[key] = event.target.value;
      renderFilteredAutoResults();
    });
  });

  const aiBox = root.querySelector('[data-ai-explanation]');

  let aiSummaryBusy = false;

  const setAiBusy = (busy) => {
    aiSummaryBusy = busy;
    aiBox?.querySelectorAll('button').forEach((button) => {
      button.disabled = busy;
    });
  };

  const updateAiSummary = async (refinement = '', activeButton = null) => {
    if (!aiBox || !results[0] || aiSummaryBusy) return;

    const pro = isProActive();
    const bundle = buildExplanationBundle(results, formData);
    const deterministicSynthesis = buildDeterministicSynthesis(bundle);
    const ruleCommentary = buildDeterministicDecisionCommentary(results, formData);

    aiBox.querySelectorAll('[data-ai-refine]').forEach((button) => {
      button.classList.toggle('is-active', button === activeButton);
    });

    if (!refinement) {
      updateExplanationSynthesis(aiBox, ruleCommentary.executive_summary || deterministicSynthesis);
      hydrateStructuredCommentary(aiBox, ruleCommentary, { state: 'loading', source: 'rules' });
    }

    trackAutoEvent('ai_commentary_requested', { refinement: Boolean(refinement) });

    setAiBusy(true);
    updateExplanationSynthesis(
      aiBox,
      refinement ? 'Sentez rafine ediliyor…' : 'Danışman sentezi hazırlanıyor…'
    );
    hydrateStructuredCommentary(aiBox, ruleCommentary, { state: 'loading', source: 'rules' });

    const outcome = await fetchAiStructuredCommentary(results, formData, refinement, { pro });

    setAiBusy(false);

    const usedFallback = !outcome.usedAi;
    if (usedFallback) {
      trackAutoEvent('ai_commentary_fallback_shown', { reason: refinement ? 'refine' : 'initial' });
      if (!hasAiNarrationBudget({ pro })) {
        trackAutoEvent('ai_commentary_failed', { reason: 'budget' });
      } else {
        trackAutoEvent('ai_commentary_failed', { reason: 'proxy_or_parse' });
      }
    } else {
      trackAutoEvent('ai_commentary_success', { source: outcome.source });
    }

    hydrateStructuredCommentary(aiBox, outcome.commentary, {
      state: usedFallback ? 'fallback' : 'ready',
      source: outcome.source
    });

    persistAiCommentaryForLead(outcome.commentary);

    updateExplanationSynthesis(aiBox, outcome.synthesis || deterministicSynthesis, {
      fallback:
        'AI yorumu şu anda üretilemedi; aşağıdaki yapılandırılmış analiz kural motoru ve tahmin kalemlerinden gelir — geçerlidir.'
    });
  };

  hydrateDealerOffers(results, formData);
  void updateAiSummary();

  root.querySelectorAll('[data-ownership-breakdown], [data-how-calculated]').forEach((el) => {
    el.addEventListener('toggle', () => {
      if (!el.open) return;
      trackAutoEvent('auto_explanation_expanded', {
        panel: el.dataset.ownershipBreakdown !== undefined ? 'ownership' : 'how_calculated'
      });
    });
  });

  aiBox?.querySelectorAll('[data-commentary-section]').forEach((el) => {
    el.addEventListener('toggle', () => {
      if (!el.open) return;
      trackAutoEvent('ai_commentary_expanded', { section: el.dataset.commentarySection || '' });
    });
  });

  aiBox?.querySelector('[data-ai-commentary-retry]')?.addEventListener('click', () => {
    trackAutoEvent('ai_next_action_clicked', { action: 'commentary_retry' });
    void updateAiSummary('', null);
  });

  aiBox?.querySelector('[data-ai-next-action]')?.addEventListener('click', () => {
    trackAutoEvent('ai_next_action_clicked', { action: 'vehicle_offer_cta' });
    const firstOffer = root.querySelector('.auto-interest-btn[data-interest="vehicle_offer"]');
    if (firstOffer instanceof HTMLElement) {
      firstOffer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstOffer.click();
    }
  });

  if (root.querySelector('.ib-auto-compare-matrix')) {
    trackUniqueAutoEvent('auto_comparison_opened', { count: displayResults.length }, 'compare_matrix');
  }

  const ensureAdvisorUpsell = () => {
    if (isProActive() || !aiBox) return true;
    if (!shouldShowUpsell('advisor_mode')) {
      openUpsellCheckout('advisor_mode', 'auto_advisor_refine', { feature: 'ai_summary', modal: true });
      return false;
    }
    if (aiBox.querySelector('[data-upsell-offer="advisor_mode"]')) return false;
    const slot = document.createElement('div');
    slot.innerHTML = renderContextualUpsellCard('advisor_mode', 'auto_advisor_refine');
    const card = slot.firstElementChild;
    if (card) {
      aiBox.querySelector('.ai-refinement-tools')?.prepend(card);
      bindContextualUpsell(aiBox);
    }
    return false;
  };

  aiBox?.querySelectorAll('[data-ai-refine]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!isProActive() && !hasAiNarrationBudget({ pro: false }) && !ensureAdvisorUpsell()) return;
      updateAiSummary(button.dataset.aiRefine || '', button);
    });
  });

  const refinementInput = aiBox?.querySelector('#ai-refinement-input');
  const refinementSubmit = aiBox?.querySelector('#ai-refinement-submit');

  const submitCustomRefinement = () => {
    const value = String(refinementInput?.value || '').trim().slice(0, 240);
    if (!value) return;
    if (!ensureAdvisorUpsell()) return;
    updateAiSummary(value);
  };

  refinementSubmit?.addEventListener('click', submitCustomRefinement);

  refinementInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitCustomRefinement();
    }
  });

  maybeShowAutoSoftAuthGate();
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

document.querySelectorAll('#gelir .btn.secondary').forEach((btn, index) => {
  const types = ['finance', 'insurance', 'report'];
  btn.dataset.interest = types[index];
  btn.classList.add('auto-interest-btn');
});


const wizard = document.getElementById('auto-wizard');

const usageOptions = [
  { label: 'Aile', value: 'family', note: 'Geniş iç hacim ve güvenlik önceliği' },
  { label: 'Şehir içi', value: 'city', note: 'Park kolaylığı ve düşük tüketim' },
  { label: 'Uzun yol', value: 'long', note: 'Konfor ve sürüş stabilitesi' },
  { label: 'İş / profesyonel', value: 'business', note: 'Prestij ve verimli kullanım' }
];

const bodyOptions = [
  { label: 'SUV', value: 'suv', note: 'Yüksek sürüş ve aile kullanımı' },
  { label: 'Sedan', value: 'sedan', note: 'Konfor ve uzun yol dengesi' },
  { label: 'Hatchback', value: 'hatchback', note: 'Şehir içi pratiklik' }
];

const fuelOptions = [
  { label: 'Fark etmez', value: 'any', note: 'En dengeli seçenekleri göster' },
  { label: 'Hibrit', value: 'hybrid', note: 'Şehir içi yakıt tasarrufu' },
  { label: 'Elektrikli', value: 'electric', note: 'Düşük işletme maliyeti' },
  { label: 'Benzinli', value: 'gasoline', note: 'Geniş servis ve yakıt ağı' },
  { label: 'Dizel', value: 'diesel', note: 'Uzun yol ve yüksek km' }
];

const kmOptions = [
  { label: '10.000 km altı', value: '8000', note: 'Düşük kullanım profili' },
  { label: '10.000 – 20.000 km', value: '15000', note: 'Ortalama yıllık kullanım' },
  { label: '20.000 – 35.000 km', value: '28000', note: 'Yoğun günlük kullanım' },
  { label: '35.000 km+', value: '40000', note: 'Profesyonel / filo düzeyi' },
  { label: 'Tam km gireceğim', value: 'custom', note: 'Net kilometre ile hassas analiz' }
];

const kmCustom = {
  type: 'text',
  placeholder: 'Örn. 22500',
  min: 1000,
  max: 100000,
  suffix: 'km'
};

const WIZARD_MILESTONES = ['Bütçe', 'Araç', 'Bölge', 'Özet'];

const WIZARD_FIELD_LABELS = {
  budget: 'toplam bütçe',
  usage: 'kullanım amacı',
  household_size: 'hane büyüklüğü',
  body: 'araç tipi',
  fuel: 'yakıt tercihi',
  km: 'yıllık kilometre',
  ownership_months: 'sahiplik süresi',
  city_ratio: 'şehir / otoyol dengesi',
  location: 'şehir',
  loan: 'finansman tercihi'
};

const wizardSteps = [
  {
    title: 'Bütçe ve kullanım profiliniz',
    description: 'İki net seçimle size uygun segmenti ve maliyet bandını belirliyoruz.',
    why: 'Bütçe toplam maliyet simülasyonunun üst sınırıdır; kullanım amacı ise yakıt ve kasa önerisini şekillendirir.',
    parts: [
      {
        key: 'budget',
        title: 'Toplam araç bütçeniz ne kadar?',
        why: 'Gerçekçi finansman ve TCO hesabı için bütçe aralığını bilmemiz gerekir.',
        options: [
          { label: '500 bin TL altı', value: '500000', note: 'Ekonomik başlangıç segmenti' },
          { label: '500 bin – 1 milyon TL', value: '900000', note: 'Ulaşılabilir, güçlü seçenekler' },
          { label: '1 – 2 milyon TL', value: '1500000', note: 'En geniş model ve fiyat aralığı' },
          { label: '2 milyon TL+', value: '2500000', note: 'Premium ve üst segment' },
          { label: 'Kendi bütçemi gireceğim', value: 'custom', note: 'Net tutarla daha hassas analiz' }
        ],
        custom: {
          type: 'text',
          placeholder: 'Örn. 1350000',
          min: 250000,
          max: 20000000,
          suffix: 'TL'
        }
      },
      {
        key: 'usage',
        title: 'Aracı en çok nasıl kullanacaksınız?',
        why: 'Kullanım profili; kasa tipi, yakıt ve konfor beklentisini doğrudan etkiler.',
        options: usageOptions
      },
      {
        key: 'household_size',
        title: 'Kaç kişilik bir hane için araç seçiyorsunuz?',
        why: 'Yolcu ve bagaj ihtiyacı; kasa tipi ve konfor beklentisini netleştirir (skor değil, karar gerekçesi).',
        options: HOUSEHOLD_SIZE_OPTIONS
      }
    ]
  },
  {
    title: 'Araç tipi ve yakıt tercihi',
    description: 'Kasa ve yakıt seçiminiz yıllık işletme maliyetini belirler.',
    why: 'Bu iki tercih, öneri listesini daraltır ve maliyet simülasyonunu kişiselleştirir.',
    parts: [
      {
        key: 'body',
        title: 'Hangi araç tipi size daha uygun?',
        why: 'SUV, sedan veya hatchback farklı kullanım ve maliyet profilleri sunar.',
        options: bodyOptions
      },
      {
        key: 'fuel',
        title: 'Yakıt tercihiniz nedir?',
        why: 'Yakıt tipi enerji maliyetini ve ikinci el değerini etkiler.',
        options: fuelOptions
      }
    ]
  },
  {
    title: 'Kullanım yoğunluğu ve bölge',
    description: 'Kilometre ve şehir bilgisi işletme maliyeti ile bölgesel eşleşmeyi iyileştirir.',
    why: 'Yıllık km bakım/yakıt tahminini belirler; şehir ise size yakın teklif yönlendirmesini güçlendirir.',
    parts: [
      {
        key: 'km',
        block: 'usage-intensity',
        title: 'Yılda yaklaşık kaç km kullanırsınız?',
        why: 'Kilometre; amortisman, yakıt ve bakım giderlerinin en güçlü girdilerinden biridir.',
        options: kmOptions,
        custom: kmCustom
      },
      {
        key: 'ownership_months',
        block: 'usage-intensity',
        title: 'Aracı ne kadar süre kullanmayı planlıyorsunuz?',
        why: 'Toplam maliyet ve değer kaybı görünümü bu süreye göre hesaplanır.',
        options: [
          { label: '12 ay', value: '12', note: 'Kısa dönem sahiplik' },
          { label: '24 ay', value: '24', note: 'Orta vadeli plan' },
          { label: '36 ay', value: '36', note: 'Önerilen varsayılan' },
          { label: '48 ay', value: '48', note: 'Uzun vadeli sahiplik' }
        ]
      },
      {
        key: 'city_ratio',
        title: 'Kullanım dengeniz nasıl?',
        why: 'Şehir içi / otoyol payı yakıt ve amortisman tahminini kişiselleştirir.',
        options: [
          { label: 'Ağırlıklı şehir içi', value: '0.85', note: 'Düşük ortalama hız' },
          { label: 'Dengeli kullanım', value: '0.6', note: 'Şehir + otoyol karışık' },
          { label: 'Ağırlıklı otoyol', value: '0.25', note: 'Uzun yol ağırlıklı' }
        ]
      },
      {
        key: 'location',
        title: 'Aracı hangi şehirde arıyorsunuz?',
        why: 'Bölgesel eşleşme; size yakın partner ve galeri yönlendirmesini iyileştirir.',
        options: [
          { label: 'İzmir', value: 'İzmir', note: 'İzmir ve çevresi' },
          { label: 'İstanbul', value: 'İstanbul', note: 'Avrupa ve Anadolu' },
          { label: 'Ankara', value: 'Ankara', note: 'Ankara ve çevresi' },
          { label: 'Antalya', value: 'Antalya', note: 'Antalya ve çevresi' },
          { label: 'Başka şehir', value: 'custom', note: 'Şehir adını kendim gireceğim' }
        ],
        custom: {
          type: 'text',
          placeholder: 'Örn. Bursa',
          min: 2,
          max: 40,
          suffix: 'il'
        },
        optionalDistrict: true
      }
    ]
  },
  {
    key: 'loan',
    title: 'Finansman kullanacak mısınız?',
    description: 'Son adım — kredi tercihi aylık yük ve toplam maliyet tablosunu günceller.',
    why: 'Finansman seçimi, ödeme planı ve toplam sahip olma maliyeti görünümünü değiştirir.',
    options: [
      { label: 'Evet, kredi kullanacağım', value: 'yes', note: 'Finansman etkisi dahil edilsin' },
      { label: 'Hayır, peşin alım', value: 'no', note: 'Peşin alım dengesiyle analiz edilsin' }
    ]
  }
];

const WIZARD_OPTION_ICONS = {
  budget: {
    '500000': '💵',
    '900000': '💰',
    '1500000': '🏦',
    '2500000': '✨',
    custom: '✎'
  },
  usage: {
    family: '👨‍👩‍👧',
    city: '🏙',
    long: '🛣',
    business: '💼'
  },
  household_size: {
    '1': '👤',
    '2': '👥',
    '3-4': '👨‍👩‍👧‍👦',
    '5+': '🏠'
  },
  body: {
    suv: '🚙',
    sedan: '🚗',
    hatchback: '🚘'
  },
  fuel: {
    any: '⚡',
    hybrid: '🔋',
    electric: '⚡',
    gasoline: '⛽',
    diesel: '🛢'
  },
  km: {
    '8000': '📉',
    '15000': '📊',
    '28000': '📈',
    '40000': '🚀',
    custom: '✎'
  },
  city_ratio: {
    '0.85': '🏙',
    '0.6': '⚖',
    '0.25': '🛣'
  },
  ownership_months: {
    '12': '1️⃣',
    '24': '2️⃣',
    '36': '3️⃣',
    '48': '4️⃣'
  },
  location: {
    'İzmir': '📍',
    'İstanbul': '📍',
    'Ankara': '📍',
    'Antalya': '📍',
    custom: '✎'
  },
  loan: {
    yes: '💳',
    no: '💵'
  }
};

function getWizardOptionIcon(fieldKey, value) {
  return WIZARD_OPTION_ICONS[fieldKey]?.[value] || '◆';
}

function isFeaturedWizardOption(fieldKey, value) {
  return value === 'custom';
}

function renderWizardOptionButton(fieldKey, option, selected) {
  const isSelected = selected === option.value;
  const isFeatured = isFeaturedWizardOption(fieldKey, option.value);
  const icon = getWizardOptionIcon(fieldKey, option.value);

  return `
    <button
      type="button"
      class="wizard-option auto-option-card ${isSelected ? 'is-selected' : ''} ${isFeatured ? 'auto-option-card--featured' : ''}"
      data-wizard-value="${escapeHtml(option.value)}"
      data-wizard-key="${escapeHtml(fieldKey)}"
      role="radio"
      aria-checked="${isSelected ? 'true' : 'false'}"
      aria-label="${escapeHtml(option.label)}"
    >
      <span class="auto-option-card__icon" aria-hidden="true">${icon}</span>
      <span class="auto-option-card__body">
        <span class="auto-option-card__title">${escapeHtml(option.label)}</span>
        <span class="auto-option-card__desc">${escapeHtml(option.note)}</span>
      </span>
      <span class="auto-option-card__check" aria-hidden="true">${isSelected ? '✓' : ''}</span>
    </button>
  `;
}

const wizardState = {};
let wizardIndex = 0;

function isWizardPartVisible(part) {
  if (!part) return true;
  if (part.key === 'city_ratio' && !shouldShowCityRatioField(wizardState.usage)) return false;
  if (part.showWhen && !part.showWhen(wizardState)) return false;
  return true;
}

function getVisibleWizardParts(step) {
  if (!Array.isArray(step.parts)) return [];
  return step.parts.filter((part) => isWizardPartVisible(part));
}

function getWizardStepKeys(step) {
  if (Array.isArray(step.parts) && step.parts.length) {
    return getVisibleWizardParts(step).map((part) => part.key);
  }
  return step.key ? [step.key] : [];
}

function getWizardFieldDef(step, fieldKey) {
  if (Array.isArray(step.parts)) {
    return step.parts.find((part) => part.key === fieldKey) || null;
  }
  return step.key === fieldKey ? step : null;
}

function wizardStepCanProceed(step) {
  return getWizardStepKeys(step).every((key) => Boolean(wizardState[key]));
}

function isSingleFieldWizardStep(step) {
  return Boolean(step.key) && !step.parts?.length;
}

function getWizardValidationMessage(step) {
  const missing = getWizardStepKeys(step).filter((key) => !wizardState[key]);
  if (!missing.length) {
    return 'Lütfen devam etmeden önce tüm soruları yanıtlayın.';
  }
  const label = WIZARD_FIELD_LABELS[missing[0]] || 'bu alan';
  return `Devam etmek için ${label} seçin${missing[0] === 'budget' || missing[0] === 'km' ? ' veya girin' : ''}.`;
}

function trackWizardStepView(stepIndex) {
  const step = wizardSteps[stepIndex];
  if (!step) return;
  if (stepIndex === 0) {
    trackAutoStart('wizard');
  }
  trackAutoEvent('auto_wizard_step', {
    step: stepIndex + 1,
    total_steps: wizardSteps.length,
    key: getWizardStepKeys(step).join('+'),
    action: 'view'
  });
}

function syncWizardToForm() {
  Object.entries(wizardState).forEach(([key, value]) => {
    if (key.endsWith('_custom')) return;

    if (key === 'location') {
      const cityInput = form.elements.city;
      const districtInput = form.elements.district;
      const cityValue = value === 'custom' ? wizardState.location_custom : value;
      if (cityInput) cityInput.value = cityValue || '';
      if (districtInput) districtInput.value = wizardState.district || '';
      return;
    }

    if (key === 'city_ratio') return;

    const input = form.elements[key];
    if (!input) return;

    if (value === 'custom') {
      const customValue = wizardState[`${key}_custom`];
      if (customValue) input.value = customValue;
      return;
    }

    input.value = value;
  });

  const cityRatioInput = form.elements.city_ratio;
  if (cityRatioInput) {
    cityRatioInput.value = resolveCityRatioForSync(wizardState.usage, wizardState.city_ratio);
  }
}

function renderWizardDistrictField() {
  return `
    <label class="wizard-custom-input wizard-district-input">
      <span>İlçe (opsiyonel — partner eşleşmesini iyileştirir)</span>
      <div>
        <input
          type="text"
          maxlength="60"
          placeholder="Örn. Bornova"
          value="${escapeHtml(wizardState.district || '')}"
          data-wizard-district
          autocomplete="address-level2"
        >
        <strong>ilçe</strong>
      </div>
    </label>
  `;
}

function autoPartOptionPool(partKey) {
  if (partKey === 'body') return bodyOptions;
  if (partKey === 'fuel') return fuelOptions;
  if (partKey === 'km') return kmOptions;
  const cityPart = wizardSteps[2]?.parts?.find((p) => p.key === 'city_ratio');
  if (partKey === 'city_ratio') return cityPart?.options || [];
  return [];
}

function renderGroupedWizardParts(parts) {
  const groups = [];
  let currentBlock = null;
  let currentParts = [];

  parts.forEach((part) => {
    const block = part.block || null;
    if (block !== currentBlock) {
      if (currentParts.length) groups.push({ block: currentBlock, parts: currentParts });
      currentBlock = block;
      currentParts = [part];
      return;
    }
    currentParts.push(part);
  });
  if (currentParts.length) groups.push({ block: currentBlock, parts: currentParts });

  return groups
    .map((group) => {
      const inner = group.parts.map((part) => renderWizardPartOptions(part)).join('');
      if (!group.block) return inner;
      return `<div class="auto-wizard-decision-block" data-wizard-block="${escapeHtml(group.block)}">${inner}</div>`;
    })
    .join('');
}

function renderWizardPartOptions(part) {
  const selected = wizardState[part.key];
  const isCustom = selected === 'custom';
  const customValue = wizardState[`${part.key}_custom`] || '';
  const filteredOptions = ['body', 'fuel', 'km', 'city_ratio'].includes(part.key)
    ? getAutoPartOptions(part.key, wizardState.usage, part.options)
    : part.options;
  const customLabel = part.key === 'budget'
    ? 'Net bütçenizi girin'
    : part.key === 'km'
      ? 'Yıllık net kilometrenizi girin'
      : part.key === 'location'
        ? 'Şehir adını girin'
        : 'Değer girin';

  return `
    <div class="wizard-part auto-wizard-part" data-wizard-part="${escapeHtml(part.key)}">
      <h4 class="wizard-part-title auto-wizard-part-title" id="auto-wizard-part-${escapeHtml(part.key)}">${escapeHtml(part.title)}</h4>
      ${part.why ? `<p class="wizard-part-why auto-wizard-part-why">${escapeHtml(part.why)}</p>` : ''}
      <div class="wizard-options auto-wizard-options" role="radiogroup" aria-labelledby="auto-wizard-part-${escapeHtml(part.key)}">
        ${filteredOptions.map((option) => renderWizardOptionButton(part.key, option, selected)).join('')}
      </div>
      ${part.custom && isCustom ? `
        <label class="wizard-custom-input auto-wizard-custom-input">
          <span>${escapeHtml(customLabel)}</span>
          <div>
            <input
              type="${part.custom.type}"
              ${part.key === 'location' ? '' : 'inputmode="numeric" pattern="[0-9]*"'}
              ${part.key === 'location'
    ? `minlength="${part.custom.min}" maxlength="${part.custom.max}"`
    : `min="${part.custom.min}" max="${part.custom.max}"`}
              placeholder="${escapeHtml(part.custom.placeholder)}"
              value="${escapeHtml(customValue)}"
              data-wizard-custom
              data-wizard-key="${escapeHtml(part.key)}"
              ${part.key === 'location' ? 'autocomplete="address-level1"' : ''}
            >
            <strong>${escapeHtml(part.custom.suffix)}</strong>
          </div>
        </label>
      ` : ''}
      ${part.optionalDistrict && (selected && selected !== 'custom' || isCustom) ? renderWizardDistrictField() : ''}
    </div>
  `;
}

function renderWizard() {
  if (!wizard) return;

  const step = wizardSteps[wizardIndex];
  const stepCopy = getAutoStepCopy(wizardIndex, wizardState.usage);
  const stepTitle = stepCopy?.title || step.title;
  const stepDescription = stepCopy?.description || step.description;
  const progress = Math.round(((wizardIndex + 1) / wizardSteps.length) * 100);
  const canProceed = wizardStepCanProceed(step);
  const isMulti = Array.isArray(step.parts) && step.parts.length > 0;
  const stepsRemaining = wizardSteps.length - wizardIndex - 1;
  const motivationCopy = stepsRemaining === 0
    ? CONVERSION_COPY.auto.wizardLastStep
    : CONVERSION_COPY.auto.wizardRemaining(stepsRemaining);

  let bodyHtml = '';

  if (isMulti) {
    bodyHtml = renderGroupedWizardParts(getVisibleWizardParts(step));
  } else {
    const selected = wizardState[step.key];
    const isCustom = selected === 'custom';
    const customValue = wizardState[`${step.key}_custom`] || '';

    bodyHtml = `
      <div class="wizard-options auto-wizard-options" role="radiogroup" aria-label="${escapeHtml(step.title)}">
        ${step.options.map((option) => renderWizardOptionButton(step.key, option, selected)).join('')}
      </div>
      ${step.custom && isCustom ? `
        <label class="wizard-custom-input auto-wizard-custom-input">
          <span>${step.key === 'budget' ? 'Net bütçenizi girin' : step.key === 'km' ? 'Yıllık net kilometrenizi girin' : 'Şehir adını girin'}</span>
          <div>
            <input
              type="${step.custom.type}"
              ${step.key === 'location' ? '' : 'inputmode="numeric" pattern="[0-9]*"'}
              ${step.key === 'location' ? `minlength="${step.custom.min}" maxlength="${step.custom.max}"` : `min="${step.custom.min}" max="${step.custom.max}"`}
              placeholder="${escapeHtml(step.custom.placeholder)}"
              value="${escapeHtml(customValue)}"
              data-wizard-custom
              data-wizard-key="${escapeHtml(step.key)}"
            >
            <strong>${escapeHtml(step.custom.suffix)}</strong>
          </div>
        </label>
      ` : ''}
      ${step.optionalDistrict ? `
        <label class="wizard-custom-input">
          <span>İlçe (opsiyonel)</span>
          <div>
            <input
              type="text"
              maxlength="60"
              placeholder="Örn. Bornova"
              value="${escapeHtml(wizardState.district || '')}"
              data-wizard-district
            >
            <strong>ilçe</strong>
          </div>
        </label>
      ` : ''}
    `;
  }

  const onboardingIntro = wizardIndex === 0
    ? `
    <div class="auto-wizard-onboarding ib-category-onboarding" aria-label="Karar altyapısı girişi">
      <p class="kicker">${escapeHtml(WIZARD_ONBOARDING.kicker)}</p>
      <p class="auto-wizard-onboarding-tagline"><strong>${escapeHtml(WIZARD_ONBOARDING.title)}</strong></p>
      <p class="auto-wizard-onboarding-lead">${escapeHtml(WIZARD_ONBOARDING.lead)}</p>
      <p class="auto-wizard-onboarding-foot text-muted-sm">${escapeHtml(WIZARD_ONBOARDING.footnote)}</p>
    </div>`
    : '';

  wizard.innerHTML = `
    ${onboardingIntro}
    <div class="wizard-progress auto-wizard-progress">
      <div class="auto-wizard-progress-top">
        <div class="auto-wizard-progress-meta">
          <span class="auto-wizard-progress-step">Adım ${wizardIndex + 1} / ${wizardSteps.length}</span>
          <span class="auto-wizard-progress-category">Auto · Araç karar analizi</span>
        </div>
        <div class="auto-wizard-progress-side">
          <span class="wizard-progress-motivation auto-wizard-progress-remaining">${motivationCopy}</span>
          <span class="wizard-progress-eta auto-wizard-progress-eta">${escapeHtml(WIZARD_ETA_BY_STEP[wizardIndex] || '~2 dk · 4 kısa adım')}</span>
        </div>
      </div>
      <div class="wizard-progress-bar auto-wizard-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" aria-label="Analiz ilerlemesi">
        <div class="wizard-progress-fill auto-wizard-progress-fill auto-wizard-progress-fill--${wizardIndex + 1}"></div>
      </div>
      <div class="auto-wizard-progress-foot">
        <p class="wizard-progress-percent auto-wizard-progress-percent">${CONVERSION_COPY.auto.wizardProgress(progress)}</p>
      </div>
      <div class="wizard-progress-milestones auto-wizard-milestones" role="list" aria-label="Analiz aşamaları">
        ${WIZARD_MILESTONES.map((label, index) => `
          <span class="wizard-milestone auto-wizard-milestone ${index < wizardIndex ? 'is-done' : ''} ${index === wizardIndex ? 'is-current' : ''}" role="listitem" ${index === wizardIndex ? 'aria-current="step"' : ''}>${escapeHtml(label)}</span>
        `).join('')}
      </div>
    </div>

    <div class="wizard-question auto-wizard-question">
      <p class="kicker">Karar altyapısı</p>
      <h3>${escapeHtml(stepTitle)}</h3>
      <p class="auto-wizard-question-desc">${escapeHtml(stepDescription)}</p>
      ${step.why ? `<p class="wizard-step-why auto-wizard-step-why">${escapeHtml(step.why)}</p>` : ''}
    </div>

    ${bodyHtml}

    <p class="wizard-cro-hint auto-wizard-hint text-muted-sm" data-cro-wizard-hint>Sonraki adım</p>
    <div class="wizard-actions auto-wizard-actions">
      <button type="button" class="btn secondary" data-wizard-back ${wizardIndex === 0 ? 'disabled' : ''}>Geri</button>
      <button type="button" class="btn primary" data-wizard-next ${canProceed ? '' : 'disabled'}>
        <span class="growth-exp-label">${wizardIndex === wizardSteps.length - 1 ? CONVERSION_COPY.auto.wizardFinish : CONVERSION_COPY.auto.wizardNext}</span>
      </button>
    </div>
  `;

  renderDecisionStepper();

  try {
    document.dispatchEvent(new CustomEvent('ib:wizard-rendered', { bubbles: true }));
  } catch {
    /* ignore */
  }
}

function showWizardInlineError(message) {
  if (!wizard) return;
  let banner = wizard.querySelector('.wizard-inline-error');
  if (!banner) {
    banner = document.createElement('p');
    banner.className = 'wizard-inline-error auto-wizard-inline-error';
    banner.setAttribute('role', 'alert');
    wizard.querySelector('.wizard-actions')?.before(banner);
  }
  banner.textContent = message;
  banner.hidden = false;
}

function clearWizardInlineError() {
  const banner = wizard?.querySelector('.wizard-inline-error');
  if (banner) banner.hidden = true;
}

function advanceWizard() {
  const step = wizardSteps[wizardIndex];
  clearWizardInlineError();

  if (!wizardStepCanProceed(step)) {
    showWizardInlineError(getWizardValidationMessage(step));
    return;
  }

  for (const fieldKey of getWizardStepKeys(step)) {
    if (wizardState[fieldKey] !== 'custom') continue;

    const fieldDef = getWizardFieldDef(step, fieldKey);
    if (!fieldDef?.custom) continue;

    const visibleCustomInput = wizard?.querySelector(`[data-wizard-custom][data-wizard-key="${fieldKey}"]`)
      || wizard?.querySelector('[data-wizard-custom]');
    const rawCustomValue = String(
      visibleCustomInput?.value ||
      wizardState[`${fieldKey}_custom`] ||
      ''
    ).trim();

    if (fieldKey === 'location') {
      const cleanLocation = String(rawCustomValue || '').trim();
      if (cleanLocation.length < fieldDef.custom.min || cleanLocation.length > fieldDef.custom.max) {
        showWizardInlineError('Şehir adı en az 2, en fazla 40 karakter olmalıdır.');
        return;
      }
      wizardState[`${fieldKey}_custom`] = cleanLocation;
    } else {
      const numericValue = Number(rawCustomValue);

      if (!rawCustomValue || Number.isNaN(numericValue)) {
        const hint = fieldKey === 'budget'
          ? 'Bütçe için yalnızca rakam girin (ör. 1350000).'
          : fieldKey === 'km'
            ? 'Yıllık kilometre için yalnızca rakam girin (ör. 18000).'
            : 'Lütfen geçerli bir sayı girin.';
        showWizardInlineError(hint);
        return;
      }

      if (numericValue < fieldDef.custom.min || numericValue > fieldDef.custom.max) {
        const rangeHint = fieldKey === 'budget'
          ? `Bütçe ${fieldDef.custom.min.toLocaleString('tr-TR')} – ${fieldDef.custom.max.toLocaleString('tr-TR')} TL aralığında olmalıdır.`
          : fieldKey === 'km'
            ? `Yıllık km ${fieldDef.custom.min.toLocaleString('tr-TR')} – ${fieldDef.custom.max.toLocaleString('tr-TR')} arasında olmalıdır.`
            : `Lütfen ${fieldDef.custom.min} – ${fieldDef.custom.max} aralığında bir değer girin.`;
        showWizardInlineError(rangeHint);
        return;
      }

      wizardState[`${fieldKey}_custom`] = rawCustomValue;
    }
  }

  syncWizardToForm();

  if (wizardIndex < wizardSteps.length - 1) {
    wizardIndex += 1;
    renderWizard();
    trackWizardStepView(wizardIndex);
    wizard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  trackAutoEvent('auto_wizard_complete', {
    total_steps: wizardSteps.length,
    keys: wizardSteps.map((s) => getWizardStepKeys(s).join('+')).join('|')
  });

  form.requestSubmit();
}

function syncWizardManualFields(event) {
  const customInput = event.target.closest('[data-wizard-custom]');
  const districtInput = event.target.closest('[data-wizard-district]');
  const step = wizardSteps[wizardIndex];

  if (districtInput) {
    wizardState.district = String(districtInput.value || '').trim().slice(0, 60);
    syncWizardToForm();
    return;
  }

  if (!customInput) return;

  const fieldKey = customInput.dataset.wizardKey || step.key;
  const fieldDef = getWizardFieldDef(step, fieldKey) || step;
  const rawValue = String(customInput.value || '');
  const cleanValue = fieldKey === 'location'
    ? rawValue.trim().slice(0, fieldDef.custom?.max || 40)
    : rawValue.replace(/\D/g, '');

  wizardState[`${fieldKey}_custom`] = cleanValue;
  customInput.value = cleanValue;
  syncWizardToForm();

  const nextButton = wizard.querySelector('[data-wizard-next]');
  if (nextButton) {
    nextButton.disabled = !wizardStepCanProceed(step);
  }
}

if (wizard) {
  bootstrapAutoFromAssistantQuery(wizardState, new URLSearchParams(window.location.search));
  if (wizardState.usage) {
    sanitizeWizardStateForUsage(wizardState, {
      body: bodyOptions,
      fuel: fuelOptions,
      km: kmOptions,
      city_ratio: autoPartOptionPool('city_ratio')
    });
  }
  renderWizard();
  trackWizardStepView(0);

  wizard.addEventListener('input', syncWizardManualFields);
  wizard.addEventListener('change', syncWizardManualFields);

  wizard.addEventListener('click', (event) => {
    const option = event.target.closest('.wizard-option');
    const back = event.target.closest('[data-wizard-back]');
    const next = event.target.closest('[data-wizard-next]');

    if (option) {
      const step = wizardSteps[wizardIndex];
      const fieldKey = option.dataset.wizardKey || step.key;
      const previousUsage = wizardState.usage;
      wizardState[fieldKey] = option.dataset.wizardValue;
      if (fieldKey === 'usage' && previousUsage !== wizardState.usage) {
        sanitizeWizardStateForUsage(wizardState, {
          body: bodyOptions,
          fuel: fuelOptions,
          km: kmOptions,
          city_ratio: autoPartOptionPool('city_ratio')
        });
        if (!shouldShowCityRatioField(wizardState.usage)) {
          delete wizardState.city_ratio;
        }
      }
      syncWizardToForm();
      renderWizard();

      if (!autoFormStarted) {
        autoFormStarted = true;
        trackAutoEvent('auto_form_started');
        try {
          sessionStorage.setItem(ONBOARDING_STARTED_KEY, '1');
        } catch {
          /* ignore */
        }
      }

      const selectedValue = option.dataset.wizardValue;
      if (isSingleFieldWizardStep(step) && selectedValue !== 'custom') {
        window.setTimeout(() => advanceWizard(), 420);
      }

      return;
    }

    if (back && wizardIndex > 0) {
      wizardIndex -= 1;
      renderWizard();
      trackWizardStepView(wizardIndex);
      return;
    }

    if (next) {
      if (next.disabled) return;
      advanceWizard();
    }
  });
}


async function checkForNewAutoDeployment() {
  try {
    const response = await fetch('/build-manifest.json', { cache: 'no-store' });
    if (!response.ok) return;

    const manifest = await response.json();
    const buildId = manifest.builtAt || '';
    if (!buildId) return;

    const storageKey = STORAGE_KEYS.LAST_BUILD_ID;
    const previous = readStorageRaw(storageKey);

    if (previous && previous !== buildId) {
      const banner = document.createElement('div');
      banner.className = 'auto-update-banner ib-update-banner';
      banner.setAttribute('role', 'status');
      banner.innerHTML = `
        <span>Yeni Auto sürümü yayında.</span>
        <button type="button" class="btn primary btn-sm">Güncelle</button>
      `;
      banner.querySelector('button')?.addEventListener('click', () => {
        window.location.reload();
      });
      document.body.prepend(banner);
    }

    writeStorageRaw(storageKey, buildId);
  } catch {
    /* non-blocking */
  }
}

checkForNewAutoDeployment();
initP4ProductPolish();
initMobilePremiumUx();
initConversionMicroUx();
initPerceivedPerformance();
initBrandConsistency();
initAutoEntitlements();
loadAutoRuntimeConfig();
void bootAnalyticsMeasurement();
trackAutoEvent('auto_page_view');

document.addEventListener('click', (event) => {
  const checkoutLink = event.target.closest('[data-auto-checkout-intent]');
  if (!checkoutLink) return;
  try {
    storeCheckoutIntentPayload({ billing: 'monthly', useTrial: true });
  } catch {
    // ignore
  }
});

const form = document.getElementById('auto-form');
let autoFormStarted = false;
let autoAnalysisRunning = false;
let autoAnalysisTimer = null;
let lastResults = [];
let allResults = [];
let resultFilters = {
  fuel: 'all',
  body: 'all',
  sort: 'score'
};

form.addEventListener('input', () => {
  if (!autoFormStarted) {
    autoFormStarted = true;
    trackAutoEvent('auto_form_started');
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (autoAnalysisRunning) return;
  autoAnalysisRunning = true;

  trackAutoEvent('auto_form_submitted');

  stopLoadingAnimation();

  const formData = readForm(form);
  getOrCreateDecisionSession();
  writeStorageRaw(STORAGE_KEYS.AUTO_LEAD_PAYLOAD, JSON.stringify(formData));
  const vehicleCatalog = await getVehicleCatalog();
  const results = recommendVehicles(formData, vehicleCatalog);
  lastResults = results;
  allResults = [...results];
  clearSelectedVehicle();

  trackAutoEvent('auto_analysis_started', formData);

  renderLoading();

  if (autoAnalysisTimer) clearTimeout(autoAnalysisTimer);

  autoAnalysisTimer = setTimeout(() => {
    try {
      stopLoadingAnimation();
      trackAutoEvent('auto_results_rendered', { count: results.length });
      renderResults(results);
      requestAnimationFrame(() => scrollToAutoResultsLeader());

      try {
        const userEmail = getAppInstance()?.currentUser?.email;
        const leadEmail = readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL) || userEmail;
        if (leadEmail && results.length) {
          enrollAutoResultsReady({
            email: leadEmail,
            user_id: getAppInstance()?.currentUser?.id,
            results_count: results.length,
            top_vehicle: results[0]?.name
          });
        }
      } catch {
        /* ignore */
      }

      try {
        const prev = Number(sessionStorage.getItem(UPSELL_RESULTS_KEY) || 0);
        const next = prev + 1;
        sessionStorage.setItem(UPSELL_RESULTS_KEY, String(next));
        if (next >= 3 && !isProActive() && readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL)) {
          enrollUpsellCampaign({ results_sessions: next });
        }
      } catch {
        /* ignore */
      }

      try {
        if (getAppInstance()?.currentUser?.id && results.length) {
          saveDecisionHistory({
            id: `auto-${Date.now()}`,
            categoryId: 'auto',
            categoryName: 'Araç Karar Analizi',
            createdAt: new Date().toISOString(),
            rawAnswers: formData,
            answers: formData,
            summary: `${results[0].name} kullanım ve bütçe profilinize göre en güçlü araç eşleşmesi olarak öne çıktı.`,
            insight: 'isteBul Auto karar analizi',
            dataHealth: 'estimated',
            recommendations: results.map((vehicle) => ({
              name: vehicle.name,
              score: vehicle.score,
              price: vehicle.price || vehicle.costs?.purchase || 0,
              yearlyCost: vehicle.costs?.annual || 0,
              financeComparisons: [{
                monthlyPayment: Math.round((Number(vehicle.costs?.total || 0) / 12) || 0)
              }]
            }))
          });
        }
      } catch (_) {}

      trackUniqueAutoEvent('auto_results_view', formData, 'results');

      if (results.length) {
        const top = results[0];
        const decisionId = `auto-${Date.now()}`;
        notifyDecisionSaved({
          id: decisionId,
          categoryId: 'auto',
          topVehicle: top.name,
          score: top.score,
          summary: `${top.name} — TCO ve kullanım profiline göre öne çıkan eşleşme`,
          revisitPath: '/auto/#analiz',
          source: 'auto_results',
          userId: getAppInstance()?.currentUser?.id || null
        });
        recordHabitAction('results_view');
        recordHabitAction('wizard_complete');
        const leadEmail = readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL);
        if (leadEmail) {
          enrollSavedDecisionRevisit({
            email: leadEmail,
            user_id: getAppInstance()?.currentUser?.id,
            decision_id: decisionId,
            saved_count: 1
          }).catch(() => {});
        }
      }
    } finally {
      autoAnalysisRunning = false;
      autoAnalysisTimer = null;
    }
  }, 2200);
});


function readAutoStorage(key){
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAutoStorage(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function toAutoFavorite(vehicle){
  return {
    id: `auto-${vehicle.name}`,
    title: vehicle.name,
    location: 'isteBul Auto AI analizi',
    price: Number(vehicle.price || vehicle.costs?.purchase || 0),
    category: 'arac',
    external_url: '',
    score: vehicle.score,
    autoGenerated: true
  };
}

function toggleAutoFavoriteFallback(vehicle){
  const key = STORAGE_KEYS.FAVORITES;
  const items = readAutoStorage(key);
  const id = `auto-${vehicle.name}`;
  const exists = items.some(item => String(item.id) === id);

  if (exists) {
    writeAutoStorage(key, items.filter(item => String(item.id) !== id));
    alert('Araç shortlist listenizden çıkarıldı.');
    return false;
  }

  writeAutoStorage(key, [...items, toAutoFavorite(vehicle)]);
  alert('Araç shortlist listenize eklendi.');
  return true;
}


function goToComparisonPage(){
  window.location.assign('/karsilastir');
}

function addAutoComparisonFallback(vehicle){
  const key = STORAGE_KEYS.COMPARISON_ITEMS;
  const items = readAutoStorage(key);
  const signature = `auto-${vehicle.name}`;

  if (items.some(item => item.signature === signature)) {
    goToComparisonPage();
    return;
  }

  const compareLimit = revenueManager.getComparisonLimit();
  if (items.length >= compareLimit && !isProActive()) {
    const root = document.getElementById('auto-results');
    if (root && shouldShowUpsell('comparison_unlimited')) {
      const slot = document.createElement('div');
      slot.innerHTML = renderContextualUpsellCard('comparison_unlimited', 'auto_compare_limit');
      const card = slot.firstElementChild;
      if (card) root.prepend(card);
      bindContextualUpsell(root);
    } else {
      openUpsellCheckout('comparison_unlimited', 'auto_compare_limit', { feature: 'comparison', modal: true });
    }
    return;
  }

  if (items.length >= 4) {
    alert('Karşılaştırma listesine en fazla 4 seçenek eklenebilir.');
    return;
  }

  const score = Number(vehicle.score || 0);

  writeAutoStorage(key, [...items, {
    id: `auto-compare-${vehicle.name}`,
    signature,
    categoryId: 'arac',
    categoryName: 'Araç Karşılaştırma',
    sourceType: 'isteBul Auto',
    title: vehicle.name,
    image: resolveVehicleImageUrl(vehicle),
    score,
    confidenceLabel: vehicle.confidenceMeta?.label || '',
    riskLevel: vehicle.confidenceMeta?.label || (score >= 85 ? 'Dengeli profil' : 'Doğrulama önerilir'),
    price: Number(vehicle.price || vehicle.costs?.purchase || 0),
    periodicCost: Number(vehicle.costs?.total || 0),
    yearlyCost: Number(vehicle.costs?.total || 0),
    monthlyPayment: Math.round((Number(vehicle.costs?.total || 0) / 12) || 0),
    costBreakdown: {
      fuelCost: vehicle.costs?.fuel,
      insurance: vehicle.costs?.insurance,
      kasko: vehicle.costs?.kasko,
      maintenance: vehicle.costs?.maintenance,
      mtv: vehicle.costs?.tax,
      depreciation: vehicle.costs?.depreciation
    },
    scoreBreakdown: vehicle.scoreBreakdown || [],
    tags: [vehicle.fuel || 'Araç', vehicle.body || 'model', 'Kural tabanlı'],
    comment: vehicle.reasons?.[0] || 'Araç karar analizi sonucu önerildi.',
    reasons: vehicle.reasons || [],
    risks: vehicle.risks || []
  }]);

  goToComparisonPage();
}

document.addEventListener('click', async (event) => {
  const compareBtn = event.target.closest('.auto-compare-btn');

  if (compareBtn) {
    const vehicleIndex = Number(compareBtn.dataset.resultIndex);
    const vehicleName = compareBtn.dataset.vehicle;
    const vehicle = lastResults[vehicleIndex] || lastResults.find(v => v.name === vehicleName);

    trackAutoEvent('auto_comparison_opened', {
      source: 'compare_button',
      vehicle: vehicleName || ''
    });

    if (vehicle) {
      addAutoComparisonFallback(vehicle);
    }

    return;
  }

  const shortlistBtn = event.target.closest('.auto-shortlist-btn');

  if (shortlistBtn) {
    const vehicleIndex = Number(shortlistBtn.dataset.resultIndex);
    const vehicleName = shortlistBtn.dataset.vehicle;
    const vehicle = lastResults[vehicleIndex] || lastResults.find(v => v.name === vehicleName);

    if (vehicle) {
      const added = getAppInstance()?.toggleAutoFavorite
        ? getAppInstance().toggleAutoFavorite(vehicle)
        : toggleAutoFavoriteFallback(vehicle);
      shortlistBtn.textContent = added ? "Shortlist'te" : "Shortlist'e ekle";
      if (added) {
        captureVehicleRecommendedSelected({
          vehicle: vehicle.name || vehicleName,
          form: readForm(document.getElementById('auto-form')),
          matchScore: vehicle.matchScore ?? vehicle.score
        });
      }
    }

    return;
  }

  const whatsappBtn = event.target.closest('.auto-whatsapp-btn');

  if (whatsappBtn) {
    const vehicle = whatsappBtn.dataset.vehicle || 'vehicle';
    const phone = autoRuntimeConfig.whatsappPhone;

    const formData = readForm(document.getElementById('auto-form'));

    const message = `Merhaba, isteBul Auto analizimde şu araç ilgimi çekti:

${vehicle}

Bütçem: ${formData.budget || '-'} TL
Kullanım: ${formData.usage || '-'}
Yakıt: ${formData.fuel || '-'}
Yıllık km: ${formData.km || '-'}
Kredi: ${formData.loan || '-'}

Destek almak istiyorum.`;

    if (!phone) {
      alert('WhatsApp numarası tanımlı değil.');
      return;
    }

    trackUniqueAutoEvent('auto_whatsapp_click', { vehicle }, vehicle);

    try {
      await callAutoIntake({
        type: 'event',
        event_name: 'auto_whatsapp_lead_intent',
        metadata: {
          ...formData,
          interest_type: 'whatsapp',
          vehicle,
          session_id: getSessionId()
        }
      });
    } catch {}

    window.open(
      'https://wa.me/' + phone + '?text=' + encodeURIComponent(message),
      '_blank'
    );
  }

  const financeCompareBtn = event.target.closest('.finance-compare-trigger');
  if (financeCompareBtn) {
    const selected = readSelectedVehicle();
    if (!selected?.name) {
      showVehicleSelectionRequiredNotice();
      return;
    }
    openFinanceCompareModal(financeCompareBtn.dataset.vehicle || selected.name);
    return;
  }

  const interestBtn = event.target.closest('.auto-interest-btn');

  if (interestBtn) {
    const interest = interestBtn.dataset.interest || 'finance';
    const selected = readSelectedVehicle();
    const requiresSelection =
      interestBtn.dataset.requiresSelection === '1' ||
      ['finance', 'finance_review', 'insurance', 'vehicle_offer', 'dealer_match', 'report'].includes(interest);

    if (requiresSelection && !selected?.name && interest !== 'premium_report') {
      showVehicleSelectionRequiredNotice();
      return;
    }

    const vehicle = interestBtn.dataset.vehicle || selected?.name || '';
    const branchIntent = interestBtn.dataset.branch || '';

    if (interest === 'premium_report' && !isProActive()) {
      trackAutoEvent('auto_premium_paywall_view', { interest_type: interest, vehicle });
      openAutoUpgradePaywall('premium_report');
      return;
    }

    if (interest === 'finance' || interest === 'finance_review') {
      trackAutoEvent('auto_finance_click', { interest_type: interest, vehicle });
      openFinanceCompareModal(vehicle);
      return;
    }

    const providerId = interestBtn.dataset.providerId || '';
    const providerEventMap = {
      finance: 'auto_financing_cta_clicked',
      insurance: 'auto_insurance_cta_clicked',
      advisor: 'auto_advisor_cta_clicked',
      dealer: 'auto_dealer_cta_clicked'
    };
    if (providerId && providerEventMap[providerId]) {
      trackAutoEvent(providerEventMap[providerId], {
        interest_type: interest,
        vehicle,
        provider_id: providerId,
        placeholder: interestBtn.dataset.providerPlaceholder === '1'
      });
    }

    const eventMap = {
      insurance: 'auto_insurance_click',
      vehicle_offer: 'auto_vehicle_offer_click',
      premium_report: 'auto_premium_report_click',
      expert_consultation: 'auto_advisor_cta_clicked',
      dealer_match: 'auto_dealer_cta_clicked',
      report: 'auto_expertise_click'
    };

    if (eventMap[interest]) {
      trackAutoEvent(eventMap[interest], { interest_type: interest, vehicle });
    }

    if (interest === 'vehicle_offer') {
      captureVehicleRecommendedSelected({
        vehicle,
        interestType: interest,
        form: readForm(document.getElementById('auto-form'))
      });
    }

    openLeadModal(interest, vehicle, {
      branchIntent,
      vehicleCatalogId: selected?.id || '',
      selectionConfirmedAt: selected?.confirmedAt || ''
    });
  }
});

document.addEventListener('click', (event) => {
  if (event.target.closest('.finance-prequal-btn')) {
    return;
  }

  const financeButton = event.target.closest('[data-interest="finance"], [data-interest="finance_review"], .finance-compare-trigger');
  if (!financeButton) return;

  event.preventDefault();
  event.stopPropagation();

  openFinanceCompareModal(financeButton.dataset.vehicle || '');
}, true);

// Expose finance comparison opener for delegated CTA handling and runtime diagnostics.
window.openFinanceCompareModal = openFinanceCompareModal;

window.addEventListener('pagehide', () => {
  const raw = readStorageRaw(STORAGE_KEYS.LEAD_ABANDON_PENDING);
  if (raw) {
    try {
      const pending = JSON.parse(raw);
      trackGrowth('growth_lead_abandon', pending, {
        funnel: 'abandoned_lead',
        funnel_step: 'modal_exit'
      });
      enrollLifecycleKeepalive('abandoned_lead', {
        context: pending,
        trigger_source: 'pagehide_abandon'
      });
    } catch {
      trackGrowth('growth_lead_abandon', {}, { funnel: 'abandoned_lead' });
      enrollLifecycleKeepalive('abandoned_lead', { trigger_source: 'pagehide_abandon' });
    }
    clearLeadAbandonPending();
    return;
  }

  try {
    if (sessionStorage.getItem(ONBOARDING_STARTED_KEY) === '1') {
      enrollLifecycleKeepalive('abandoned_onboarding', {
        trigger_source: 'pagehide_onboarding'
      });
    }
  } catch {
    /* ignore */
  }
});
