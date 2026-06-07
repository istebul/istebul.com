/**
 * isteBul AI Listings — internal admin test panel (Executive AI Decision Center V5).
 *
 * INTERNAL TEST ONLY. Not linked from homepage, categories, or admin nav.
 * approved means internally approved only; public publishing remains disabled.
 *
 * Enable locally: localStorage.setItem('istebul_ai_listings_admin', 'on')
 * Set secret: localStorage.setItem('istebul_ai_listings_secret', '<AI_LISTINGS_EDGE_SECRET>')
 */

import {
  ADMIN_ENABLE_KEY,
  ADMIN_SECRET_KEY,
  buildAnalysisTimelineHtml,
  buildDuplicateCheckCardHtml,
  buildEdgeRequestHeaders,
  buildExecutiveDashboardHtml,
  buildImportPreviewHtml,
  buildKpiCardsHtml,
  buildListingCardHtml,
  buildListingSkeletonHtml,
  buildPremiumDashboardHtml,
  buildStatusFilterChipsHtml,
  computeKpiStats,
  getAdminPanelState,
  getEdgeSecret,
  getListingAnalyzePath,
  getSupabaseAnonKey,
  mapEdgeResponse,
  previewImportContent,
  buildAcquisitionErrorsExportText,
  resolveActiveStatusFilter,
  resolveEdgeBaseUrl,
  resolveImportAnalyzeFlag,
  safeRenderText,
  translateAdminErrorMessage,
  validateAttributesJson,
  validateSourceUrl
} from './ai-listings-admin-core.js';
import { runDuplicateEngine } from '../../supabase/functions/_shared/ai-listings/duplicate/duplicate-engine.js';
import { IMPORT_MAX_ROWS } from '../../supabase/functions/_shared/ai-listings/import-parser.js';
import { buildAcquisitionEventPayload } from '../../supabase/functions/_shared/ai-listings/acquisition/acquisition-events.js';
import { runAiListingBuilder, logBuilderStage, logBuilderError } from '../ai-listings-builder/index.js';
import {
  buildRepositoryDashboardHtml,
  buildRepositoryKpiCardsHtml
} from './ai-listings-repository-admin.js';
import {
  buildAnalyticsDashboardHtml,
  buildAnalyticsKpiCardsHtml
} from './ai-listings-analytics-admin.js';
import { hydrateLazyCharts } from '../ai-listings-analytics/chart-builder.js';
import {
  buildCollectorDashboardHtml,
  buildCollectorPreviewHtml,
  buildCollectorErrorsExportText,
  previewCollectorContent
} from './ai-listings-collector-admin.js';
import {
  buildRecommendationsDashboardHtml,
  readRecommendationProfileFromForm
} from './ai-listings-recommendations-admin.js';
import {
  buildDecisionCoachInput,
  runDecisionCoach
} from '../ai-decision-coach/index.js';
import { buildDecisionCoachPanelHtml } from '../ai-decision-coach/coach-card-builder.js';
import {
  buildDefaultScenario,
  buildSimulatorInput,
  runDecisionSimulator
} from '../ai-decision-simulator/index.js';
import {
  buildSimulatorDrawerPanelHtml,
  buildSimulatorPanelHtml
} from '../ai-decision-simulator/simulator-card-builder.js';
import { buildReportInput, runDecisionReport } from '../ai-decision-report/index.js';
import { buildDecisionReportPanelHtml } from '../ai-decision-report/report-card-builder.js';
import { buildOwnershipCostInput, runOwnershipCostSimulator } from '../ai-ownership-cost/index.js';
import { buildOwnershipCostPanelHtml } from '../ai-ownership-cost/cost-card-builder.js';
import {
  buildPurchaseDecisionInput,
  runPurchaseDecisionEngine
} from '../ai-purchase-decision/index.js';
import { buildExecutiveDecisionPanelHtml } from '../ai-purchase-decision/executive-decision-card-builder.js';
import {
  buildExplainabilityInput,
  runExplainabilityEngine
} from '../ai-decision-explainability/index.js';
import { buildExplainabilityPanelHtml } from '../ai-decision-explainability/explainability-card-builder.js';
import {
  buildExecutiveReportInput,
  runExecutiveReportEngine
} from '../ai-executive-decision-report/index.js';
import { buildExecutiveReportPanelHtml } from '../ai-executive-decision-report/executive-report-card-builder.js';
import { buildCompareInput, runCompareEngine } from '../ai-compare-intelligence/index.js';
import { buildComparePanelHtml } from '../ai-compare-intelligence/compare-card-builder.js';
import { toggleRepositoryFilter } from '../ai-listings-repository/index.js';
import { sanitizeSearchQuery } from '../ai-listings-search/index.js';
import {
  buildDecisionWorkspaceHtml,
  buildDecisionWorkspaceEmptyHtml
} from './ai-listings-decision-workspace.js';
import {
  buildScenarioInput,
  runScenarioSimulator
} from '../ai-scenario-simulator/index.js';
import { buildScenarioPanelHtml, buildScenarioShellHtml } from '../ai-scenario-simulator/scenario-card-builder.js';
import { buildOwnershipCostInput as buildOcInput } from '../ai-ownership-cost/index.js';
import { buildExecutiveDecisionShellHtml } from '../ai-purchase-decision/executive-decision-card-builder.js';
import { buildExplainabilityShellHtml } from '../ai-decision-explainability/explainability-card-builder.js';
import { buildExecutiveReportShellHtml } from '../ai-executive-decision-report/executive-report-card-builder.js';
import { buildCompareShellHtml } from '../ai-compare-intelligence/compare-card-builder.js';

/** @type {Record<string, unknown>|null} */
let selectedListing = null;

/** @type {string} */
let activeStatusFilter = '';

/** @type {number} */
let importValidRowCount = 0;

/** @type {Record<string, unknown>|null} */
let acquisitionResult = null;

/** @type {Array<Record<string, unknown>>} */
let cachedListings = [];

/** @type {string} */
let searchQuery = '';

/** @type {'create'|'import'|'builder'|null} */
let openDrawerType = null;

/** @type {boolean} */
let createDrawerMounted = false;

/** @type {boolean} */
let importDrawerMounted = false;

/** @type {boolean} */
let builderDrawerMounted = false;

/** @type {{ create_payload?: Record<string, unknown> }|null} */
let pendingBuilderResult = null;

/** @type {string} */
let lastKpiStatsKey = '';

/** @type {'decision'|'repository'|'analytics'|'collector'|'recommendations'} */
let activeAdminView = 'decision';

/** @type {string} */
let repoCategoryTab = 'all';

/** @type {string[]} */
let repoFilters = [];

/** @type {string} */
let repoAiSearchQuery = '';

/** @type {string} */
let repoSearchSort = 'best_match';

/** @type {string} */
let lastRepoKpiStatsKey = '';

/** @type {string} */
let lastAnalyticsKpiStatsKey = '';

/** @type {Record<string, () => string>} */
let analyticsChartBuilders = {};

/** @type {Record<string, unknown>|null} */
let collectorPreviewResult = null;

/** @type {Record<string, unknown>} */
let recommendationProfile = {
  category: 'vehicle',
  budget: '',
  city: '',
  usage_type: 'family',
  family_size: '',
  annual_km: '',
  risk_tolerance: 'medium',
  priority: 'total_cost'
};

/** @type {boolean} */
let recommendationGenerated = false;

/** @type {ReturnType<typeof import('../ai-recommendation-engine/index.js').runRecommendationEngine>|null} */
let cachedRecommendationResult = null;

/** @type {string[]} */
let compareSelectedIds = [];

/** @type {boolean} */
let compareModeEnabled = false;

function $(id) {
  return document.getElementById(id);
}

function env() {
  return typeof window !== 'undefined' ? window.__env || {} : {};
}

function storage() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function setStatus(message, type = 'info') {
  const el = $('ai-listings-status');
  if (!el) return;
  el.className = `ai-listings-admin__status ai-listings-admin__status--${type}`;
  el.textContent = message;
}

async function edgeRequest(path, { method = 'GET', body } = {}) {
  const base = resolveEdgeBaseUrl(env());
  const secret = getEdgeSecret(storage());
  const anonKey = getSupabaseAnonKey(env());

  if (!base) {
    return { ok: false, status: 0, message: 'env.js içinde SUPABASE_URL yapılandırılmamış' };
  }
  if (!anonKey) {
    return { ok: false, status: 0, message: 'Supabase anon key eksik' };
  }
  if (!secret) {
    return {
      ok: false,
      status: 0,
      message: 'Edge secret eksik — localStorage istebul_ai_listings_secret ayarlayın'
    };
  }

  const response = await fetch(`${base}${path}`, {
    method,
    headers: buildEdgeRequestHeaders({ secret, anonKey, hasBody: body !== undefined }),
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const json = await response.json().catch(() => ({}));
  const mapped = mapEdgeResponse(response, json);
  if (!mapped.ok) {
    return { ...mapped, message: translateAdminErrorMessage(mapped.message) };
  }
  return mapped;
}

function renderDisabledState() {
  const root = $('ai-listings-admin-root');
  if (!root) return;
  root.innerHTML = `
    <div class="ai-listings-admin__gate">
      <h2>Yapay Zeka Karar Merkezi — Devre Dışı</h2>
      <p>Bu iç test paneli varsayılan olarak gizlidir.</p>
      <pre class="ai-listings-admin__code">localStorage.setItem('${ADMIN_ENABLE_KEY}', 'on')</pre>
      <p>Etkinleştirdikten sonra sayfayı yenileyin. Bkz. docs/ai-listings/ADMIN_TEST_PANEL.md</p>
    </div>`;
}

function renderSecretWarning() {
  const warn = $('ai-listings-secret-warning');
  if (!warn) return;
  warn.hidden = false;
  warn.innerHTML = `
    <strong>Kurulum gerekli:</strong>
    <code>localStorage.${ADMIN_SECRET_KEY}</code> değerini
    <code>AI_LISTINGS_EDGE_SECRET</code> ile ayarlayın, ardından yenileyin.
    <pre class="ai-listings-admin__code">localStorage.setItem('${ADMIN_SECRET_KEY}', '&lt;secret&gt;')</pre>`;
}

function renderStatusFilterChips() {
  const container = $('ai-listings-status-filters');
  if (!container) return;
  container.innerHTML = buildStatusFilterChipsHtml(activeStatusFilter);
  container.querySelectorAll('[data-status-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      activeStatusFilter = resolveActiveStatusFilter(chip.getAttribute('data-status-filter'));
      renderStatusFilterChips();
      loadListings();
    });
  });
}

function animateKpiCounters(root = document) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelectorAll('[data-kpi-counter]').forEach((el) => {
    const card = el.closest('[data-kpi-value]');
    const targetRaw = card?.getAttribute('data-kpi-value') ?? '0';
    const target = Number(targetRaw);
    if (!Number.isFinite(target)) {
      el.textContent = String(targetRaw);
      return;
    }
    if (prefersReduced) {
      el.textContent = String(target);
      return;
    }
    const duration = 600;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      el.textContent = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function renderKpiCards(listings) {
  const kpiEl = $('ai-listings-kpi');
  if (!kpiEl) return;
  const stats = computeKpiStats(listings);
  const statsKey = JSON.stringify(stats);
  if (statsKey === lastKpiStatsKey && kpiEl.childElementCount > 0) return;
  lastKpiStatsKey = statsKey;
  kpiEl.innerHTML = buildKpiCardsHtml(stats);
  if (activeAdminView === 'decision') animateKpiCounters(kpiEl);
}

function renderRepositoryKpiCards(listings) {
  const kpiEl = $('ai-listings-repo-kpi');
  if (!kpiEl) return;
  const { query } = buildRepositoryDashboardHtml(listings, {
    categoryTab: repoCategoryTab,
    filters: repoFilters,
    search: searchQuery
  });
  const statsKey = JSON.stringify(query.stats);
  if (statsKey === lastRepoKpiStatsKey && kpiEl.childElementCount > 0) return;
  lastRepoKpiStatsKey = statsKey;
  kpiEl.innerHTML = buildRepositoryKpiCardsHtml(query.stats);
  if (activeAdminView === 'repository') animateKpiCounters(kpiEl);
}

function renderAnalyticsKpiCards(listings) {
  const kpiEl = $('ai-listings-analytics-kpi');
  if (!kpiEl) return;
  const { analytics } = buildAnalyticsDashboardHtml(listings);
  const statsKey = JSON.stringify(analytics.kpi);
  if (statsKey === lastAnalyticsKpiStatsKey && kpiEl.childElementCount > 0) return;
  lastAnalyticsKpiStatsKey = statsKey;
  kpiEl.innerHTML = buildAnalyticsKpiCardsHtml(analytics.kpi ?? {});
  if (activeAdminView === 'analytics') animateKpiCounters(kpiEl);
}

function setAdminView(view) {
  const next =
    view === 'repository'
      ? 'repository'
      : view === 'analytics'
        ? 'analytics'
        : view === 'collector'
          ? 'collector'
          : view === 'recommendations'
            ? 'recommendations'
            : 'decision';
  activeAdminView = next;

  document.querySelectorAll('[data-admin-view]').forEach((tab) => {
    const isActive = tab.getAttribute('data-admin-view') === next;
    tab.classList.toggle('ai-listings-admin__view-tab--active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  $('ai-listings-kpi')?.toggleAttribute('hidden', next !== 'decision');
  $('ai-listings-repo-kpi')?.toggleAttribute('hidden', next !== 'repository');
  $('ai-listings-analytics-kpi')?.toggleAttribute('hidden', next !== 'analytics');
  $('ai-listings-sidebar')?.toggleAttribute(
    'hidden',
    next === 'repository' || next === 'analytics' || next === 'collector' || next === 'recommendations'
  );

  if (next === 'repository') {
    selectedListing = null;
    renderRepositoryView();
    renderRepositoryKpiCards(cachedListings);
  } else if (next === 'analytics') {
    selectedListing = null;
    renderAnalyticsView();
    renderAnalyticsKpiCards(cachedListings);
  } else if (next === 'collector') {
    selectedListing = null;
    renderCollectorView();
  } else if (next === 'recommendations') {
    selectedListing = null;
    renderRecommendationsView();
  } else {
    renderExecutiveDashboard();
    renderKpiCards(cachedListings);
  }
}

function renderCollectorView() {
  const detailEl = $('ai-listings-detail');
  if (!detailEl) return;

  detailEl.innerHTML = buildCollectorDashboardHtml(collectorPreviewResult);
  bindCollectorDashboardEvents(detailEl);
  updateCollectorActionState();
  clearTimelineHost();
}

function updateCollectorActionState() {
  const root = $('ai-listings-detail');
  const readyCount = Number(collectorPreviewResult?.repository_ready_rows ?? 0);
  const hasErrors = (collectorPreviewResult?.errors?.length ?? 0) > 0;
  const saveBtn = root?.querySelector('[data-collector-action="save"]');
  const analyzeBtn = root?.querySelector('[data-collector-action="save-analyze"]');
  const downloadBtn = root?.querySelector('[data-collector-action="download-errors"]');

  if (readyCount > 0) {
    saveBtn?.removeAttribute('disabled');
    analyzeBtn?.removeAttribute('disabled');
  } else {
    saveBtn?.setAttribute('disabled', '');
    analyzeBtn?.setAttribute('disabled', '');
  }

  if (hasErrors) downloadBtn?.removeAttribute('disabled');
  else downloadBtn?.setAttribute('disabled', '');
}

function handleCollectorPreview() {
  const format = $('ai-collector-format')?.value ?? 'csv';
  const content = $('ai-collector-content')?.value ?? '';
  collectorPreviewResult = previewCollectorContent(format, content, cachedListings);

  const host = $('ai-collector-preview-host');
  if (host) host.innerHTML = buildCollectorPreviewHtml(collectorPreviewResult);

  updateCollectorActionState();
  setStatus(collectorPreviewResult.summary?.text ?? 'Collector önizlemesi hazır.', 'success');
}

async function handleCollectorSave(analyzeAfter = false) {
  const payloads = collectorPreviewResult?.repository_ready_payloads;
  if (!Array.isArray(payloads) || !payloads.length) {
    setStatus('Kaydedilecek geçerli kayıt yok.', 'error');
    return;
  }

  setStatus('Geçerli kayıtlar kaydediliyor…', 'info');
  let created = 0;
  let analyzed = 0;

  for (let offset = 0; offset < payloads.length; offset += IMPORT_MAX_ROWS) {
    const chunk = payloads.slice(offset, offset + IMPORT_MAX_ROWS);
    const result = await edgeRequest('/listings/import', {
      method: 'POST',
      body: { format: 'json', content: JSON.stringify(chunk), analyze: analyzeAfter }
    });

    if (!result.ok) {
      setStatus(result.message, 'error');
      return;
    }

    const summary = result.data ?? {};
    created += Number(summary.created_count ?? 0);
    analyzed += Number(summary.analyzed_count ?? 0);
  }

  setStatus(
    `Collector kaydı tamamlandı: ${created} oluşturuldu, ${analyzed} analiz edildi.`,
    'success'
  );
  collectorPreviewResult = null;
  await loadListings();
  renderCollectorView();
}

function handleCollectorDownloadErrors() {
  const text = buildCollectorErrorsExportText(
    /** @type {Array<{ row: number, messages: string[] }>} */ (collectorPreviewResult?.errors ?? [])
  );
  if (!text) {
    setStatus('İndirilecek hata yok.', 'info');
    return;
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'ai-listings-collector-errors.txt';
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus('Hata raporu indirildi.', 'success');
}

function bindCollectorDashboardEvents(root) {
  root.querySelector('#ai-collector-format')?.addEventListener('change', () => {
    collectorPreviewResult = null;
    updateCollectorActionState();
  });
  root.querySelector('#ai-collector-content')?.addEventListener('input', () => {
    collectorPreviewResult = null;
    updateCollectorActionState();
  });
  root.querySelector('[data-collector-action="preview"]')?.addEventListener('click', handleCollectorPreview);
  root.querySelector('[data-collector-action="save"]')?.addEventListener('click', () => {
    void handleCollectorSave(false);
  });
  root.querySelector('[data-collector-action="save-analyze"]')?.addEventListener('click', () => {
    void handleCollectorSave(true);
  });
  root.querySelector('[data-collector-action="download-errors"]')?.addEventListener('click', handleCollectorDownloadErrors);
}

function renderAnalyticsView() {
  const detailEl = $('ai-listings-detail');
  if (!detailEl) return;

  const { html, chartBuilders } = buildAnalyticsDashboardHtml(cachedListings);
  analyticsChartBuilders = chartBuilders;
  detailEl.innerHTML = html;
  hydrateLazyCharts(detailEl, chartBuilders);
  clearTimelineHost();
}

function bindRepositoryDashboardEvents(root) {
  root.querySelectorAll('[data-repo-category-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      repoCategoryTab = tab.getAttribute('data-repo-category-tab') ?? 'all';
      renderRepositoryView();
      renderRepositoryKpiCards(cachedListings);
    });
  });

  root.querySelectorAll('[data-repo-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const filterId = chip.getAttribute('data-repo-filter') ?? '';
      repoFilters = toggleRepositoryFilter(repoFilters, filterId);
      renderRepositoryView();
      renderRepositoryKpiCards(cachedListings);
    });
  });

  root.querySelectorAll('[data-repo-search-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const filterId = chip.getAttribute('data-repo-search-filter') ?? '';
      repoFilters = toggleRepositoryFilter(repoFilters, filterId);
      renderRepositoryView();
      renderRepositoryKpiCards(cachedListings);
    });
  });

  const aiSearchInput = root.querySelector('#ai-listings-repo-ai-search');
  if (aiSearchInput) {
    aiSearchInput.addEventListener('input', (event) => {
      repoAiSearchQuery = sanitizeSearchQuery(/** @type {HTMLInputElement} */ (event.target).value);
      renderRepositoryView();
      renderRepositoryKpiCards(cachedListings);
    });
  }

  const sortSelect = root.querySelector('[data-repo-search-sort]');
  if (sortSelect) {
    sortSelect.addEventListener('change', (event) => {
      repoSearchSort = /** @type {HTMLSelectElement} */ (event.target).value || 'best_match';
      renderRepositoryView();
    });
  }

  root.querySelectorAll('[data-repo-search-suggestion]').forEach((btn) => {
    btn.addEventListener('click', () => {
      repoAiSearchQuery = sanitizeSearchQuery(btn.getAttribute('data-repo-search-suggestion') ?? '');
      renderRepositoryView();
      renderRepositoryKpiCards(cachedListings);
    });
  });

  root.querySelectorAll('[data-repo-record-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-repo-record-id');
      const listing = cachedListings.find((item) => String(item.id) === id);
      if (listing) {
        selectedListing = listing;
        activeAdminView = 'decision';
        setAdminView('decision');
        void showListingDetail(listing);
      }
    });
  });
}

function renderRecommendationsView() {
  const detailEl = $('ai-listings-detail');
  if (!detailEl) return;

  const { html, result } = buildRecommendationsDashboardHtml(cachedListings, recommendationProfile, {
    generated: recommendationGenerated,
    compareMode: compareModeEnabled,
    compareSelectedIds
  });
  if (result) cachedRecommendationResult = result;

  detailEl.innerHTML = html;
  bindRecommendationsDashboardEvents(detailEl);
  clearTimelineHost();
}

function closeDecisionCoachPanel(root) {
  const host = root.querySelector('#ai-coach-panel-host');
  if (host) {
    host.hidden = true;
    host.innerHTML = '';
  }
  root.querySelector('[data-coach-backdrop]')?.setAttribute('hidden', '');
  document.body.classList.remove('ai-listings-admin--coach-open');
}

function closeDecisionSimulatorPanel(root) {
  const host = root.querySelector('#ai-sim-panel-host');
  if (host) {
    host.hidden = true;
    host.innerHTML = '';
  }
  root.querySelector('[data-sim-backdrop]')?.setAttribute('hidden', '');
  document.body.classList.remove('ai-listings-admin--sim-open');
}

function closeDecisionReportPanel(root) {
  const host = root.querySelector('#ai-report-panel-host');
  if (host) {
    host.hidden = true;
    host.innerHTML = '';
  }
  root.querySelector('[data-report-backdrop]')?.setAttribute('hidden', '');
  document.body.classList.remove('ai-listings-admin--report-open');
}

function closeOwnershipCostPanel(root) {
  const host = root.querySelector('#ai-cost-panel-host');
  if (host) {
    host.hidden = true;
    host.innerHTML = '';
  }
  root.querySelector('[data-cost-backdrop]')?.setAttribute('hidden', '');
  document.body.classList.remove('ai-listings-admin--cost-open');
}

function closePurchaseDecisionPanel(root) {
  const host = root.querySelector('#ai-pd-panel-host');
  if (host) {
    host.hidden = true;
    host.innerHTML = '';
  }
  root.querySelector('[data-pd-backdrop]')?.setAttribute('hidden', '');
  document.body.classList.remove('ai-listings-admin--pd-open');
}

function closeExplainabilityPanel(root) {
  const host = root.querySelector('#ai-exp-panel-host');
  if (host) {
    host.hidden = true;
    host.innerHTML = '';
  }
  root.querySelector('[data-exp-backdrop]')?.setAttribute('hidden', '');
  document.body.classList.remove('ai-listings-admin--exp-open');
}

function closeExecutiveReportPanel(root) {
  const host = root.querySelector('#ai-edr-panel-host');
  if (host) {
    host.hidden = true;
    host.innerHTML = '';
  }
  root.querySelector('[data-edr-backdrop]')?.setAttribute('hidden', '');
  document.body.classList.remove('ai-listings-admin--edr-open');
}

function closeComparePanel(root) {
  const host = root.querySelector('#ai-cmp-panel-host');
  if (host) {
    host.hidden = true;
    host.innerHTML = '';
  }
  root.querySelector('[data-cmp-backdrop]')?.setAttribute('hidden', '');
  document.body.classList.remove('ai-listings-admin--cmp-open');
}

/**
 * @param {HTMLElement} root
 */
function updateCompareToolbar(root) {
  const countEl = root.querySelector('[data-cmp-count]');
  const compareBtn = root.querySelector('[data-cmp-action="compare"]');
  const clearBtn = root.querySelector('[data-cmp-action="clear"]');
  const toggle = root.querySelector('[data-cmp-action="toggle-mode"]');

  if (countEl) countEl.textContent = `${compareSelectedIds.length} seçili`;
  if (compareBtn) compareBtn.disabled = compareSelectedIds.length < 2;
  if (clearBtn) clearBtn.hidden = compareSelectedIds.length === 0;
  if (toggle) toggle.checked = compareModeEnabled;
}

function openComparePanel(root) {
  if (compareSelectedIds.length < 2) {
    const host = root.querySelector('#ai-cmp-panel-host');
    if (!host) return;
    host.innerHTML = buildComparePanelHtml(null, { title: 'Karşılaştırma Analizi' });
    host.hidden = false;
    document.body.classList.add('ai-listings-admin--cmp-open');
    const body = host.querySelector('.ai-cmp-panel__body');
    if (body) {
      body.innerHTML = '<p class="ai-cmp-panel__empty">Karşılaştırma için en az iki öneri seçin.</p>';
    }
    host.querySelector('[data-cmp-panel-action="close"]')?.addEventListener('click', () => closeComparePanel(root));
    host.querySelector('[data-cmp-backdrop]')?.addEventListener('click', () => closeComparePanel(root));
    return;
  }

  if (!cachedRecommendationResult?.top?.length) return;

  closeDecisionCoachPanel(root);
  closeDecisionSimulatorPanel(root);
  closeDecisionReportPanel(root);
  closeOwnershipCostPanel(root);
  closePurchaseDecisionPanel(root);
  closeExplainabilityPanel(root);
  closeExecutiveReportPanel(root);

  const selected = cachedRecommendationResult.top.filter((item) =>
    compareSelectedIds.includes(String(item.id))
  );

  const profile = cachedRecommendationResult.profile ?? recommendationProfile;
  const cmpInput = buildCompareInput(selected, profile);
  const compareIntelligence = runCompareEngine(cmpInput);

  const host = root.querySelector('#ai-cmp-panel-host');
  if (!host) return;

  host.innerHTML = buildComparePanelHtml(compareIntelligence, {
    title: `Karşılaştırma Analizi (${selected.length} seçenek)`
  });
  host.hidden = false;
  document.body.classList.add('ai-listings-admin--cmp-open');

  host.querySelector('[data-cmp-panel-action="close"]')?.addEventListener('click', () => {
    closeComparePanel(root);
  });
  host.querySelector('[data-cmp-backdrop]')?.addEventListener('click', () => {
    closeComparePanel(root);
  });
}

/**
 * @param {HTMLElement} root
 * @returns {Record<string, unknown>}
 */
function readSimulatorScenarioFromForm(root) {
  /** @type {Record<string, unknown>} */
  const scenario = {};
  root.querySelectorAll('[data-sim-field]').forEach((field) => {
    const key = field.getAttribute('data-sim-field');
    if (!key) return;
    const value = /** @type {HTMLInputElement|HTMLSelectElement} */ (field).value;
    if (key === 'budget_delta_pct' || key === 'annual_km') {
      scenario[key] = Number(value);
    } else {
      scenario[key] = value;
    }
  });
  return scenario;
}

/**
 * @param {string} recordId
 * @param {Record<string, unknown>} scenario
 * @returns {{ result: ReturnType<typeof runDecisionSimulator>, coach: ReturnType<typeof runDecisionCoach>, selected: Record<string, unknown> }|null}
 */
function runSimulatorForPanel(recordId, scenario) {
  if (!cachedRecommendationResult?.top?.length) return null;

  const selected = cachedRecommendationResult.top.find((item) => String(item.id) === String(recordId));
  if (!selected) return null;

  const profile = cachedRecommendationResult.profile ?? recommendationProfile;
  const coachInput = buildDecisionCoachInput(profile, selected, cachedRecommendationResult.top);
  const coach = runDecisionCoach(coachInput);
  const simInput = buildSimulatorInput(selected, coach, profile);
  const result = runDecisionSimulator(simInput, scenario);
  return { result, coach, selected };
}

/**
 * @param {HTMLElement} host
 * @param {HTMLElement} root
 */
function bindSimulatorPanelEvents(host, root) {
  host.querySelector('[data-sim-action="close"]')?.addEventListener('click', () => {
    closeDecisionSimulatorPanel(root);
  });
  host.querySelector('[data-sim-backdrop]')?.addEventListener('click', () => {
    closeDecisionSimulatorPanel(root);
  });
}

function openDecisionCoachPanel(root, recordId) {
  if (!cachedRecommendationResult?.top?.length) return;

  const selected = cachedRecommendationResult.top.find((item) => String(item.id) === String(recordId));
  if (!selected) return;

  const input = buildDecisionCoachInput(
    cachedRecommendationResult.profile ?? recommendationProfile,
    selected,
    cachedRecommendationResult.top
  );
  const coach = runDecisionCoach(input);

  const host = root.querySelector('#ai-coach-panel-host');
  if (!host) return;

  host.innerHTML = buildDecisionCoachPanelHtml(coach, {
    title: String(selected.title ?? 'Karar Koçu'),
    recordId: String(recordId)
  });
  host.hidden = false;

  const backdrop = root.querySelector('[data-coach-backdrop]');
  backdrop?.removeAttribute('hidden');

  document.body.classList.add('ai-listings-admin--coach-open');

  host.querySelector('[data-coach-action="close"]')?.addEventListener('click', () => {
    closeDecisionCoachPanel(root);
  });
  backdrop?.addEventListener('click', () => closeDecisionCoachPanel(root));
}

function openDecisionSimulatorPanel(root, recordId) {
  if (!cachedRecommendationResult?.top?.length) return;

  const selected = cachedRecommendationResult.top.find((item) => String(item.id) === String(recordId));
  if (!selected) return;

  closeDecisionCoachPanel(root);

  const profile = cachedRecommendationResult.profile ?? recommendationProfile;
  const defaultScenario = buildDefaultScenario(profile);
  const host = root.querySelector('#ai-sim-panel-host');
  if (!host) return;

  host.innerHTML = buildSimulatorDrawerPanelHtml({
    title: String(selected.title ?? 'Karar Simülatörü'),
    recordId: String(recordId),
    scenario: defaultScenario
  });
  host.hidden = false;
  document.body.classList.add('ai-listings-admin--sim-open');
  bindSimulatorPanelEvents(host, root);

  const handleSimulatorRun = () => {
    const scenario = readSimulatorScenarioFromForm(host);
    const computed = runSimulatorForPanel(recordId, scenario);
    if (!computed) return;

    const { result, coach } = computed;
    host.innerHTML = buildSimulatorPanelHtml(result, {
      title: String(selected.title ?? 'Karar Simülatörü'),
      coachLabel: String(coach.coach_label ?? '—'),
      recordId: String(recordId),
      scenario
    });
    bindSimulatorPanelEvents(host, root);
    host.querySelector('[data-sim-action="run"]')?.addEventListener('click', handleSimulatorRun);
  };

  host.querySelector('[data-sim-action="run"]')?.addEventListener('click', handleSimulatorRun);
}

function openDecisionReportPanel(root, recordId) {
  if (!cachedRecommendationResult?.top?.length) return;

  const selected = cachedRecommendationResult.top.find((item) => String(item.id) === String(recordId));
  if (!selected) return;

  closeDecisionCoachPanel(root);
  closeDecisionSimulatorPanel(root);

  const profile = cachedRecommendationResult.profile ?? recommendationProfile;
  const reportInput = buildReportInput(selected, profile, cachedRecommendationResult.top);
  const report = runDecisionReport(reportInput);

  const host = root.querySelector('#ai-report-panel-host');
  if (!host) return;

  host.innerHTML = buildDecisionReportPanelHtml(report, {
    title: String(selected.title ?? 'AI Karar Raporu'),
    recordId: String(recordId)
  });
  host.hidden = false;
  document.body.classList.add('ai-listings-admin--report-open');

  host.querySelector('[data-report-action="close"]')?.addEventListener('click', () => {
    closeDecisionReportPanel(root);
  });
  host.querySelector('[data-report-backdrop]')?.addEventListener('click', () => {
    closeDecisionReportPanel(root);
  });
}

function openOwnershipCostPanel(root, recordId) {
  if (!cachedRecommendationResult?.top?.length) return;

  const selected = cachedRecommendationResult.top.find((item) => String(item.id) === String(recordId));
  if (!selected) return;

  closeDecisionCoachPanel(root);
  closeDecisionSimulatorPanel(root);
  closeDecisionReportPanel(root);
  closePurchaseDecisionPanel(root);
  closeExplainabilityPanel(root);
  closeExecutiveReportPanel(root);

  const profile = cachedRecommendationResult.profile ?? recommendationProfile;
  const costInput = buildOwnershipCostInput(selected, profile);
  const cost = runOwnershipCostSimulator(costInput);

  const host = root.querySelector('#ai-cost-panel-host');
  if (!host) return;

  host.innerHTML = buildOwnershipCostPanelHtml(cost, {
    title: String(selected.title ?? 'Sahip Olma Maliyeti'),
    recordId: String(recordId)
  });
  host.hidden = false;
  document.body.classList.add('ai-listings-admin--cost-open');

  host.querySelector('[data-cost-action="close"]')?.addEventListener('click', () => {
    closeOwnershipCostPanel(root);
  });
  host.querySelector('[data-cost-backdrop]')?.addEventListener('click', () => {
    closeOwnershipCostPanel(root);
  });
}

function openPurchaseDecisionPanel(root, recordId) {
  if (!cachedRecommendationResult?.top?.length) return;

  const selected = cachedRecommendationResult.top.find((item) => String(item.id) === String(recordId));
  if (!selected) return;

  closeDecisionCoachPanel(root);
  closeDecisionSimulatorPanel(root);
  closeDecisionReportPanel(root);
  closeOwnershipCostPanel(root);
  closeExplainabilityPanel(root);
  closeExecutiveReportPanel(root);

  const profile = cachedRecommendationResult.profile ?? recommendationProfile;
  const pdInput = buildPurchaseDecisionInput(selected, profile);
  const purchaseDecision = runPurchaseDecisionEngine(pdInput);

  const host = root.querySelector('#ai-pd-panel-host');
  if (!host) return;

  host.innerHTML = buildExecutiveDecisionPanelHtml(purchaseDecision, {
    title: String(selected.title ?? 'Al Kararı Analizi'),
    recordId: String(recordId)
  });
  host.hidden = false;
  document.body.classList.add('ai-listings-admin--pd-open');

  host.querySelector('[data-pd-action="close"]')?.addEventListener('click', () => {
    closePurchaseDecisionPanel(root);
  });
  host.querySelector('[data-pd-backdrop]')?.addEventListener('click', () => {
    closePurchaseDecisionPanel(root);
  });
}

function openExplainabilityPanel(root, recordId) {
  if (!cachedRecommendationResult?.top?.length) return;

  const selected = cachedRecommendationResult.top.find((item) => String(item.id) === String(recordId));
  if (!selected) return;

  closeDecisionCoachPanel(root);
  closeDecisionSimulatorPanel(root);
  closeDecisionReportPanel(root);
  closeOwnershipCostPanel(root);
  closePurchaseDecisionPanel(root);
  closeExecutiveReportPanel(root);

  const profile = cachedRecommendationResult.profile ?? recommendationProfile;
  const expInput = buildExplainabilityInput(selected, profile);
  const explainability = runExplainabilityEngine(expInput);

  const host = root.querySelector('#ai-exp-panel-host');
  if (!host) return;

  host.innerHTML = buildExplainabilityPanelHtml(explainability, {
    title: String(selected.title ?? 'Karar Açıklaması'),
    recordId: String(recordId)
  });
  host.hidden = false;
  document.body.classList.add('ai-listings-admin--exp-open');

  host.querySelector('[data-exp-action="close"]')?.addEventListener('click', () => {
    closeExplainabilityPanel(root);
  });
  host.querySelector('[data-exp-backdrop]')?.addEventListener('click', () => {
    closeExplainabilityPanel(root);
  });
}

function openExecutiveReportPanel(root, recordId) {
  if (!cachedRecommendationResult?.top?.length) return;

  const selected = cachedRecommendationResult.top.find((item) => String(item.id) === String(recordId));
  if (!selected) return;

  closeDecisionCoachPanel(root);
  closeDecisionSimulatorPanel(root);
  closeDecisionReportPanel(root);
  closeOwnershipCostPanel(root);
  closePurchaseDecisionPanel(root);
  closeExplainabilityPanel(root);

  const profile = cachedRecommendationResult.profile ?? recommendationProfile;
  const edrInput = buildExecutiveReportInput(selected, profile);
  const executiveDecisionReport = runExecutiveReportEngine(edrInput);

  const host = root.querySelector('#ai-edr-panel-host');
  if (!host) return;

  host.innerHTML = buildExecutiveReportPanelHtml(executiveDecisionReport, {
    title: String(selected.title ?? 'Executive Decision Report'),
    recordId: String(recordId)
  });
  host.hidden = false;
  document.body.classList.add('ai-listings-admin--edr-open');

  host.querySelector('[data-edr-action="close"]')?.addEventListener('click', () => {
    closeExecutiveReportPanel(root);
  });
  host.querySelector('[data-edr-backdrop]')?.addEventListener('click', () => {
    closeExecutiveReportPanel(root);
  });
}

function bindRecommendationsDashboardEvents(root) {
  root.querySelector('[data-rec-action="generate"]')?.addEventListener('click', () => {
    recommendationProfile = readRecommendationProfileFromForm(root);
    recommendationGenerated = true;
    closeDecisionCoachPanel(root);
    closeDecisionSimulatorPanel(root);
    closeDecisionReportPanel(root);
    closeOwnershipCostPanel(root);
    closePurchaseDecisionPanel(root);
    closeExplainabilityPanel(root);
    closeExecutiveReportPanel(root);
    closeComparePanel(root);
    compareSelectedIds = [];
    renderRecommendationsView();
  });

  root.querySelectorAll('[data-rec-coach-id]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeDecisionSimulatorPanel(root);
      closeDecisionReportPanel(root);
      closeOwnershipCostPanel(root);
      const id = btn.getAttribute('data-rec-coach-id');
      if (id) openDecisionCoachPanel(root, id);
    });
  });

  root.querySelectorAll('[data-rec-sim-id]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeDecisionReportPanel(root);
      closeOwnershipCostPanel(root);
      const id = btn.getAttribute('data-rec-sim-id');
      if (id) openDecisionSimulatorPanel(root, id);
    });
  });

  root.querySelectorAll('[data-rec-report-id]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeOwnershipCostPanel(root);
      const id = btn.getAttribute('data-rec-report-id');
      if (id) openDecisionReportPanel(root, id);
    });
  });

  root.querySelectorAll('[data-rec-cost-id]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = btn.getAttribute('data-rec-cost-id');
      if (id) openOwnershipCostPanel(root, id);
    });
  });

  root.querySelectorAll('[data-rec-pd-id]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = btn.getAttribute('data-rec-pd-id');
      if (id) openPurchaseDecisionPanel(root, id);
    });
  });

  root.querySelectorAll('[data-rec-exp-id]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = btn.getAttribute('data-rec-exp-id');
      if (id) openExplainabilityPanel(root, id);
    });
  });

  root.querySelectorAll('[data-rec-edr-id]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = btn.getAttribute('data-rec-edr-id');
      if (id) openExecutiveReportPanel(root, id);
    });
  });

  root.querySelector('[data-cmp-action="toggle-mode"]')?.addEventListener('change', (event) => {
    compareModeEnabled = /** @type {HTMLInputElement} */ (event.target).checked;
    renderRecommendationsView();
  });

  root.querySelector('[data-cmp-action="compare"]')?.addEventListener('click', () => {
    openComparePanel(root);
  });

  root.querySelector('[data-cmp-action="clear"]')?.addEventListener('click', () => {
    compareSelectedIds = [];
    updateCompareToolbar(root);
    root.querySelectorAll('[data-rec-compare-id]').forEach((cb) => {
      /** @type {HTMLInputElement} */ (cb).checked = false;
    });
  });

  root.querySelectorAll('[data-rec-compare-id]').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      event.stopPropagation();
      const id = checkbox.getAttribute('data-rec-compare-id');
      if (!id) return;
      if (/** @type {HTMLInputElement} */ (checkbox).checked) {
        if (!compareSelectedIds.includes(id)) compareSelectedIds.push(id);
      } else {
        compareSelectedIds = compareSelectedIds.filter((item) => item !== id);
      }
      updateCompareToolbar(root);
    });
  });

  updateCompareToolbar(root);

  root.querySelectorAll('[data-rec-record-id]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (/** @type {HTMLElement} */ (event.target).closest('[data-rec-coach-id], [data-rec-sim-id], [data-rec-report-id], [data-rec-cost-id], [data-rec-pd-id], [data-rec-exp-id], [data-rec-edr-id], [data-rec-compare-id], .ai-rec-card__compare]')) return;
      const id = card.getAttribute('data-rec-record-id');
      const listing = cachedListings.find((item) => String(item.id) === id);
      if (listing) {
        selectedListing = listing;
        activeAdminView = 'decision';
        setAdminView('decision');
        void showListingDetail(listing);
      }
    });
  });
}

function renderRepositoryView() {
  const detailEl = $('ai-listings-detail');
  if (!detailEl) return;

  const { html } = buildRepositoryDashboardHtml(cachedListings, {
    categoryTab: repoCategoryTab,
    filters: repoFilters,
    search: searchQuery,
    aiSearch: repoAiSearchQuery,
    sortBy: repoSearchSort,
    selectedId: selectedListing?.id ?? null
  });

  detailEl.innerHTML = html;
  bindRepositoryDashboardEvents(detailEl);
  clearTimelineHost();
}

function bindExecutiveDashboardEvents(root) {
  root.querySelectorAll('[data-listing-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-listing-id');
      const listing = cachedListings.find((item) => String(item.id) === id);
      if (listing) {
        showListingDetail(listing);
        toggleFilterPanel(false);
      }
    });
  });
}

function renderExecutiveDashboard() {
  if (selectedListing) return;
  const detailEl = $('ai-listings-detail');
  if (!detailEl) return;
  detailEl.innerHTML = `
    <div class="ai-ws-overview-wrap">
      ${buildDecisionWorkspaceEmptyHtml()}
      <section class="ai-ws-overview-compact" aria-label="Karar merkezi özeti">
        ${buildExecutiveDashboardHtml(cachedListings)}
      </section>
    </div>`;
  bindExecutiveDashboardEvents(detailEl);
  clearTimelineHost();
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {Record<string, unknown>|null}
 */
function findRecommendationForListing(listing) {
  const id = String(listing?.id ?? '');
  if (!id || !cachedRecommendationResult?.top?.length) return null;
  return cachedRecommendationResult.top.find((item) => String(item.id) === id) ?? null;
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>|null} [recommendation]
 * @returns {Record<string, unknown>}
 */
function resolveWorkspaceContext(listing, recommendation = null) {
  const rec = recommendation ?? findRecommendationForListing(listing);
  const profile = cachedRecommendationResult?.profile ?? recommendationProfile;
  const analysis = /** @type {Record<string, unknown>} */ (listing.latest_analysis ?? {});

  /** @type {Record<string, unknown>} */
  const ctx = {
    listing,
    recommendation: rec,
    limitedData: !listing.title || !listing.price,
    aiScore: analysis.ai_score ?? analysis.decision_score ?? rec?.decision_score ?? '—',
    qualityScore: rec?.quality_score ?? analysis.quality_score ?? '—',
    riskScore: rec?.risk_score ?? analysis.risk_score ?? '—',
    riskLabel: '—',
    decisionScore: '—',
    confidenceScore: '—',
    explanationScore: '—',
    reportScore: '—',
    trustScore: '—',
    decisionLabel: '—',
    riskLevel: '—',
    decisionSummary: rec?.reasons_text ?? 'Mevcut verilerle karar değerlendirmesi yapılabilir.',
    hasOwnershipCost: false,
    hasNegotiation: false,
    hasCompare: compareSelectedIds.length >= 2,
    duplicateLabel: null,
    missingCount: 0,
    scenarioTeaser: 'Fiyat, maliyet ve risk senaryolarını tahmini olarak değerlendirin.'
  };

  if (!rec?.id) return ctx;

  try {
    const pdInput = buildPurchaseDecisionInput(rec, profile);
    const pd = runPurchaseDecisionEngine(pdInput, { skipCache: true });
    const expInput = buildExplainabilityInput(rec, profile);
    const exp = runExplainabilityEngine(expInput, { skipCache: true });
    const cost = runOwnershipCostSimulator(buildOcInput(rec, profile), { skipCache: true });
    const edr = runExecutiveReportEngine(buildExecutiveReportInput(rec, profile), { skipCache: true });

    ctx.decisionScore = pd?.decisionScore ?? '—';
    ctx.confidenceScore = pd?.confidenceScore ?? '—';
    ctx.decisionLabel = pd?.decisionLabel ?? '—';
    ctx.riskLevel = pd?.riskLevel ?? '—';
    ctx.riskLabel = pd?.riskLabel ?? ctx.riskScore;
    ctx.explanationScore = exp?.explanationScore ?? '—';
    ctx.trustScore = exp?.decisionSnapshot?.trustScore ?? rec?.trust_score ?? '—';
    ctx.reportScore = edr?.reportScore ?? '—';
    ctx.hasOwnershipCost = Boolean(cost?.total_cost);
    ctx.hasNegotiation = Array.isArray(pd?.negotiationScenario) && pd.negotiationScenario.length > 0;
    ctx.decisionSummary = pd?.summary ?? ctx.decisionSummary;
    ctx.scenarioTeaser = `Tahmini karar skoru ${pd?.decisionScore ?? '—'}; senaryolarla etkiyi inceleyin.`;
  } catch {
    ctx.limitedData = true;
  }

  return ctx;
}

/**
 * @param {HTMLElement} root
 */
function bindWorkspaceEvents(root) {
  root.querySelectorAll('[data-ws-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-ws-action');
      const listingId = root.querySelector('[data-ws-listing-id]')?.getAttribute('data-ws-listing-id');
      if (!listingId || !selectedListing) return;
      const rec = findRecommendationForListing(selectedListing);
      if (action === 'purchase' && rec) openPurchaseDecisionPanel(root, listingId);
      else if (action === 'explain' && rec) openExplainabilityPanel(root, listingId);
      else if (action === 'report' && rec) openExecutiveReportPanel(root, listingId);
      else if (action === 'compare') {
        if (activeAdminView !== 'recommendations') {
          activeAdminView = 'recommendations';
          setAdminView('recommendations');
        }
        compareModeEnabled = true;
        if (!compareSelectedIds.includes(listingId)) compareSelectedIds.push(listingId);
        renderRecommendationsView();
      } else if (action === 'scenario' && rec) openScenarioPanel(root, listingId, 'price_minus_5');
      else if (action === 'negotiation' && rec) openPurchaseDecisionPanel(root, listingId);
      else if (action === 'quality' && rec) openExplainabilityPanel(root, listingId);
    });
  });
}

function closeScenarioPanel(root) {
  const host = root.querySelector('#ai-ss-panel-host');
  if (host) {
    host.hidden = true;
    host.innerHTML = '';
  }
  root.querySelector('[data-ss-backdrop]')?.setAttribute('hidden', '');
  document.body.classList.remove('ai-listings-admin--ss-open');
}

function openScenarioPanel(root, recordId, scenarioKey = 'price_minus_5') {
  const rec = findRecommendationForListing(
    cachedListings.find((item) => String(item.id) === String(recordId)) ?? selectedListing ?? {}
  );
  if (!rec) {
    const host = root.querySelector('#ai-ss-panel-host') ?? document.querySelector('#ai-ss-panel-host');
    if (!host) return;
    host.innerHTML = buildScenarioPanelHtml(null);
    host.hidden = false;
    document.body.classList.add('ai-listings-admin--ss-open');
    host.querySelector('[data-ss-action="close"]')?.addEventListener('click', () => closeScenarioPanel(root));
    return;
  }

  const profile = cachedRecommendationResult?.profile ?? recommendationProfile;
  const simulation = runScenarioSimulator(buildScenarioInput(rec, profile, scenarioKey));
  const host = root.querySelector('#ai-ss-panel-host') ?? document.querySelector('#ai-ss-panel-host');
  if (!host) return;

  host.innerHTML = buildScenarioPanelHtml(simulation, { title: String(rec.title ?? 'Senaryo Simülasyonu') });
  host.hidden = false;
  document.body.classList.add('ai-listings-admin--ss-open');

  const close = () => closeScenarioPanel(root);
  host.querySelector('[data-ss-action="close"]')?.addEventListener('click', close);
  host.querySelector('[data-ss-backdrop]')?.addEventListener('click', close);
  host.querySelectorAll('[data-ss-scenario]').forEach((preset) => {
    preset.addEventListener('click', () => {
      const key = preset.getAttribute('data-ss-scenario');
      if (key) openScenarioPanel(root, recordId, key);
    });
  });
}

function closeAllDrawers() {
  $('ai-listings-create-drawer')?.setAttribute('hidden', '');
  $('ai-listings-import-drawer')?.setAttribute('hidden', '');
  $('ai-listings-builder-drawer')?.setAttribute('hidden', '');
  $('ai-listings-drawer-backdrop')?.setAttribute('hidden', '');
  document.body.classList.remove('ai-listings-admin--drawer-open');
  openDrawerType = null;
  closeNewMenu();
}

function mountDrawerTemplate(templateId, bodyId, onMounted) {
  const template = /** @type {HTMLTemplateElement|null} */ ($(templateId));
  const body = $(bodyId);
  if (!template || !body || body.childElementCount > 0) return false;
  body.appendChild(template.content.cloneNode(true));
  onMounted?.();
  return true;
}

function bindCreateFormEvents() {
  $('ai-listings-create-form')?.addEventListener('submit', (event) => handleCreateSubmit(event));
  $('ai-listings-create-analyze-btn')?.addEventListener('click', async (event) => {
    await handleCreateSubmit(event, { analyzeAfter: true });
  });
}

/** @type {boolean} */
let builderEventsBound = false;

/**
 * @returns {HTMLElement|null}
 */
function getBuilderDrawerBody() {
  return $('ai-listings-builder-drawer-body');
}

function bindBuilderFormEvents() {
  const body = getBuilderDrawerBody();
  if (!body || builderEventsBound) return;

  body.querySelector('#ai-listings-builder-preview-btn')?.addEventListener('click', handleBuilderPreview);
  body.querySelector('#ai-listings-builder-save-btn')?.addEventListener('click', () => handleBuilderSave(false));
  body.querySelector('#ai-listings-builder-save-analyze-btn')?.addEventListener('click', () => handleBuilderSave(true));
  body.querySelector('#ai-listings-builder-input')?.addEventListener('input', () => {
    pendingBuilderResult = null;
    body.querySelector('#ai-listings-builder-save-btn')?.setAttribute('disabled', '');
    body.querySelector('#ai-listings-builder-save-analyze-btn')?.setAttribute('disabled', '');
  });

  builderEventsBound = true;
  logBuilderStage('admin:events-bound', { has_preview_btn: Boolean(body.querySelector('#ai-listings-builder-preview-btn')) });
}

function mountBuilderDrawer() {
  const body = getBuilderDrawerBody();
  if (!body) {
    logBuilderStage('admin:mount-failed', { reason: 'drawer-body-missing' });
    return false;
  }

  const hasForm = Boolean(body.querySelector('#ai-listings-builder-preview-btn'));
  if (!hasForm) {
    if (body.childElementCount > 0) body.innerHTML = '';
    const mounted = mountDrawerTemplate(
      'ai-listings-builder-template',
      'ai-listings-builder-drawer-body',
      bindBuilderFormEvents
    );
    if (!mounted) {
      logBuilderStage('admin:mount-failed', { reason: 'template-mount-failed' });
      return false;
    }
    builderDrawerMounted = true;
    return true;
  }

  bindBuilderFormEvents();
  builderDrawerMounted = true;
  logBuilderStage('admin:mount-reused', { has_form: true });
  return true;
}

function openBuilderDrawer() {
  if (!mountBuilderDrawer()) {
    setStatus('AI İlan Oluşturucu formu yüklenemedi. Sayfayı yenileyin.', 'error');
    return;
  }

  closeAllDrawers();
  $('ai-listings-builder-drawer')?.removeAttribute('hidden');
  $('ai-listings-drawer-backdrop')?.removeAttribute('hidden');
  document.body.classList.add('ai-listings-admin--drawer-open');
  openDrawerType = 'builder';
  logBuilderStage('admin:drawer-opened');
}

function closeBuilderDrawer() {
  if (openDrawerType === 'builder') closeAllDrawers();
}

function updateBuilderActionState(enabled) {
  const body = getBuilderDrawerBody();
  const saveBtn = body?.querySelector('#ai-listings-builder-save-btn');
  const analyzeBtn = body?.querySelector('#ai-listings-builder-save-analyze-btn');
  if (enabled) {
    saveBtn?.removeAttribute('disabled');
    analyzeBtn?.removeAttribute('disabled');
  } else {
    saveBtn?.setAttribute('disabled', '');
    analyzeBtn?.setAttribute('disabled', '');
  }
}

function handleBuilderPreview() {
  const body = getBuilderDrawerBody();
  const input = body?.querySelector('#ai-listings-builder-input')?.value ?? '';
  const previewEl = body?.querySelector('#ai-listings-builder-preview');

  logBuilderStage('admin:preview-click', {
    input_length: input.length,
    has_preview_host: Boolean(previewEl),
    drawer_mounted: Boolean(body?.querySelector('#ai-listings-builder-preview-btn'))
  });

  if (!previewEl) {
    logBuilderStage('admin:preview-host-missing');
    setStatus('Önizleme alanı bulunamadı. Lütfen sayfayı yenileyin.', 'error');
    return;
  }

  let result;
  try {
    result = runAiListingBuilder(input);
  } catch (error) {
    logBuilderError('admin:preview-exception', error);
    pendingBuilderResult = null;
    updateBuilderActionState(false);
    previewEl.innerHTML = `<p class="ai-listings-admin__error">${safeRenderText('Önizleme oluşturulamadı.')}</p>`;
    setStatus('Önizleme oluşturulamadı.', 'error');
    return;
  }

  if (!result.ok) {
    pendingBuilderResult = null;
    updateBuilderActionState(false);
    previewEl.innerHTML = `<p class="ai-listings-admin__error">${safeRenderText(result.message)}</p>`;
    setStatus(result.message, 'error');
    logBuilderStage('admin:preview-failed', { message: result.message });
    return;
  }

  pendingBuilderResult = result;
  updateBuilderActionState(true);
  previewEl.innerHTML = result.preview_html;

  logBuilderStage('admin:preview-rendered', {
    html_length: result.preview_html.length,
    title: result.canonical?.title ?? null,
    preview_child_count: previewEl.childElementCount
  });

  previewEl.querySelectorAll('[data-builder-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-builder-action');
      if (action === 'save') handleBuilderSave(false);
      if (action === 'save-analyze') handleBuilderSave(true);
    });
  });

  setStatus(`Önizleme hazır (${result.input_type}). Güven: %${result.canonical.confidence}.`, 'success');
}

async function handleBuilderSave(analyzeAfter = false) {
  if (!pendingBuilderResult?.create_payload) {
    setStatus('Önce önizleme oluşturun.', 'error');
    return;
  }

  const payload = pendingBuilderResult.create_payload;
  if (!String(payload.title ?? '').trim() || !String(payload.category ?? '').trim()) {
    setStatus('Başlık ve kategori zorunludur. Girdiyi düzenleyip tekrar önizleyin.', 'error');
    return;
  }

  const duplicate = runDuplicateEngine(payload, cachedListings);
  if (duplicate.status !== 'new' && duplicate.matched_listing) {
    showDuplicateCreateModal(payload, duplicate, duplicate.matched_listing, { analyzeAfter });
    setStatus('Benzer ilan tespit edildi. Lütfen bir işlem seçin.', 'info');
    return;
  }

  const listing = await finalizeCreateListing(payload, { analyzeAfter });
  if (listing) {
    pendingBuilderResult = null;
    const inputEl = $('ai-listings-builder-input');
    if (inputEl) inputEl.value = '';
    const previewEl = $('ai-listings-builder-preview');
    if (previewEl) previewEl.innerHTML = '';
    updateBuilderActionState(false);
    closeBuilderDrawer();
  }
}

function bindImportFormEvents() {
  $('ai-listings-import-preview-btn')?.addEventListener('click', handleImportPreview);
  $('ai-listings-import-run-btn')?.addEventListener('click', handleImportRun);
  $('ai-listings-import-content')?.addEventListener('input', () => {
    importValidRowCount = 0;
    acquisitionResult = null;
    updateImportButtonState();
  });
  $('ai-listings-import-format')?.addEventListener('change', () => {
    importValidRowCount = 0;
    acquisitionResult = null;
    updateImportButtonState();
  });
  $('ai-listings-import-file')?.addEventListener('change', handleImportFileSelect);
  $('ai-listings-import-preview')?.addEventListener('click', handleAcquisitionActionClick);
  document.querySelectorAll('[data-import-format-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const format = tab.getAttribute('data-import-format-tab') === 'json' ? 'json' : 'csv';
      setImportFormat(format);
      importValidRowCount = 0;
      acquisitionResult = null;
      updateImportButtonState();
    });
  });
  updateImportButtonState();
}

function mountCreateDrawer() {
  if (createDrawerMounted) return;
  const mounted = mountDrawerTemplate('ai-listings-create-template', 'ai-listings-create-drawer-body', bindCreateFormEvents);
  if (mounted) createDrawerMounted = true;
}

function mountImportDrawer() {
  if (importDrawerMounted) return;
  const mounted = mountDrawerTemplate('ai-listings-import-template', 'ai-listings-import-drawer-body', bindImportFormEvents);
  if (mounted) importDrawerMounted = true;
}

function openCreateDrawer() {
  mountCreateDrawer();
  closeAllDrawers();
  $('ai-listings-create-drawer')?.removeAttribute('hidden');
  $('ai-listings-drawer-backdrop')?.removeAttribute('hidden');
  document.body.classList.add('ai-listings-admin--drawer-open');
  openDrawerType = 'create';
}

function openImportDrawer(format = 'csv') {
  mountImportDrawer();
  closeAllDrawers();
  $('ai-listings-import-drawer')?.removeAttribute('hidden');
  $('ai-listings-drawer-backdrop')?.removeAttribute('hidden');
  document.body.classList.add('ai-listings-admin--drawer-open');
  openDrawerType = 'import';
  setImportFormat(format);
}

function bindDashboardTabs(root) {
  const tabsRoot = root.querySelector('[data-dashboard-tabs]');
  if (!tabsRoot) return;

  const tabs = tabsRoot.querySelectorAll('[data-dashboard-tab]');
  const panels = tabsRoot.querySelectorAll('[data-dashboard-panel]');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-dashboard-tab');
      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle('ai-listings-admin__tab--active', isActive);
        item.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      panels.forEach((panel) => {
        const isActive = panel.getAttribute('data-dashboard-panel') === target;
        panel.classList.toggle('ai-listings-admin__tab-panel--active', isActive);
        panel.hidden = !isActive;
      });
    });
  });
}

function renderTimelineHost(listing, analysis, events) {
  const host = $('ai-listings-timeline-host');
  if (!host) return;
  host.innerHTML = buildAnalysisTimelineHtml(listing, analysis, events);
  host.hidden = false;
}

function clearTimelineHost() {
  const host = $('ai-listings-timeline-host');
  if (!host) return;
  host.innerHTML = '';
  host.hidden = true;
}

function closeCreateDrawer() {
  if (openDrawerType === 'create') closeAllDrawers();
}

function closeImportDrawer() {
  if (openDrawerType === 'import') closeAllDrawers();
}

function toggleNewMenu(forceOpen) {
  const menu = $('ai-listings-new-menu');
  const btn = $('ai-listings-new-menu-btn');
  if (!menu || !btn) return;
  const shouldOpen = forceOpen ?? menu.hidden;
  menu.hidden = !shouldOpen;
  btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

function closeNewMenu() {
  toggleNewMenu(false);
}

function toggleFilterPanel(forceOpen) {
  const sidebar = $('ai-listings-sidebar');
  const btn = $('ai-listings-filter-toggle');
  if (!sidebar || !btn) return;
  const isMobile = window.matchMedia('(max-width: 1100px)').matches;
  if (!isMobile) return;
  const shouldOpen = forceOpen ?? !sidebar.classList.contains('ai-listings-admin__sidebar--open');
  sidebar.classList.toggle('ai-listings-admin__sidebar--open', shouldOpen);
  btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

function filterListingsBySearch(listings) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return listings;
  return listings.filter((listing) => {
    const haystack = [
      listing.title,
      listing.category,
      listing.status,
      listing.source_type,
      listing.location,
      listing.id
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ');
    return haystack.includes(query);
  });
}

function renderListingsList(listings) {
  const listEl = $('ai-listings-list');
  const countEl = $('ai-listings-list-count');
  if (!listEl) return;

  const filtered = filterListingsBySearch(listings);
  if (countEl) countEl.textContent = String(filtered.length);

  if (!filtered.length) {
    listEl.innerHTML = '<p class="ai-listings-admin__muted">İlan bulunamadı.</p>';
    return;
  }

  const selectedId = String(selectedListing?.id ?? '');
  listEl.innerHTML = filtered
    .map((listing) =>
      buildListingCardHtml(listing, String(listing.id) === selectedId, { candidates: listings })
    )
    .join('');

  const selectListingCard = (btn) => {
    const id = btn.getAttribute('data-listing-id');
    const listing = listings.find((item) => String(item.id) === id);
    if (listing) {
      selectedListing = listing;
      void showListingDetail(listing);
      toggleFilterPanel(false);
    }
  };

  listEl.querySelectorAll('[data-listing-id]').forEach((btn) => {
    btn.addEventListener('click', () => selectListingCard(btn));
    btn.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectListingCard(btn);
      }
    });
  });
}

function showDetailSkeleton() {
  const detailEl = $('ai-listings-detail');
  if (!detailEl) return;
  detailEl.innerHTML = `
    <div class="ai-listings-admin__detail-skeleton">
      <div class="ai-listings-admin__skeleton-block ai-listings-admin__skeleton-block--hero"></div>
      <div class="ai-listings-admin__skeleton-block"></div>
      <div class="ai-listings-admin__skeleton-block"></div>
    </div>`;
}

async function autoAnalyzeListing(listing) {
  const listingId = String(listing?.id ?? '').trim();
  if (!listingId) return { ok: false, message: 'İlan kimliği bulunamadı.' };

  setStatus('Analiz çalıştırılıyor…', 'info');
  const result = await edgeRequest(getListingAnalyzePath(listingId), { method: 'POST' });
  if (!result.ok) {
    setStatus(result.message, 'error');
    return result;
  }

  setStatus('Analiz tamamlandı.', 'success');
  await loadListings();
  await showListingDetail(listing);
  return result;
}

function handlePdfExport(listing, analysis) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    setStatus('PDF penceresi açılamadı. Pop-up engelleyiciyi kontrol edin.', 'error');
    return;
  }

  const title = String(listing.title ?? 'İlan Raporu');
  const summary = String(analysis?.summary ?? 'Analiz özeti mevcut değil.');
  const aiScore = analysis?.ai_score ?? '—';
  const riskScore = analysis?.risk_score ?? '—';

  printWindow.document.write(`<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>${title} — AI Rapor</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 2rem; color: #111; }
  h1 { font-size: 1.5rem; } .meta { color: #666; font-size: 0.875rem; }
  .scores { display: flex; gap: 1.5rem; margin: 1rem 0; }
  .score { font-size: 1.25rem; font-weight: 600; }
</style></head><body>
<h1>${title}</h1>
<p class="meta">isteBul AI Karar Merkezi — İç Rapor</p>
<div class="scores">
  <div class="score">AI Skoru: ${aiScore}</div>
  <div class="score">Risk Skoru: ${riskScore}</div>
</div>
<p>${summary}</p>
<p class="meta">Oluşturulma: ${new Date().toLocaleString('tr-TR')}</p>
<script>window.onload = () => { window.print(); }<\/script>
</body></html>`);
  printWindow.document.close();
  setStatus('PDF raporu hazırlandı.', 'success');
}

async function loadListings() {
  const listEl = $('ai-listings-list');
  if (!listEl) return;

  const params = new URLSearchParams();
  const category = $('ai-listings-filter-category')?.value?.trim();
  const sourceType = $('ai-listings-filter-source')?.value?.trim();
  const limit = $('ai-listings-filter-limit')?.value?.trim();
  if (category) params.set('category', category);
  if (activeStatusFilter) params.set('status', activeStatusFilter);
  if (sourceType) params.set('source_type', sourceType);
  if (limit) params.set('limit', limit);

  const query = params.toString() ? `?${params.toString()}` : '';
  listEl.innerHTML = buildListingSkeletonHtml(5);

  const result = await edgeRequest(`/listings${query}`);
  if (!result.ok) {
    listEl.innerHTML = `<p class="ai-listings-admin__error">${safeRenderText(result.message)}</p>`;
    renderKpiCards([]);
    setStatus(result.message, 'error');
    return;
  }

  cachedListings = /** @type {Array<Record<string, unknown>>} */ (result.data?.listings ?? []);
  renderKpiCards(cachedListings);
  renderRepositoryKpiCards(cachedListings);
  renderAnalyticsKpiCards(cachedListings);
  renderListingsList(cachedListings);
  if (selectedListing) {
    const refreshed = cachedListings.find((item) => String(item.id) === String(selectedListing.id));
    if (refreshed) selectedListing = refreshed;
  } else if (activeAdminView === 'repository') {
    renderRepositoryView();
  } else if (activeAdminView === 'analytics') {
    renderAnalyticsView();
  } else if (activeAdminView === 'collector') {
    renderCollectorView();
  } else {
    renderExecutiveDashboard();
  }
  setStatus(`${cachedListings.length} ilan yüklendi.`, 'success');
}

function mountGlobalPanelHosts() {
  const main = $('ai-listings-admin');
  if (!main || main.querySelector('#ai-ss-panel-host')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = [
    buildExecutiveDecisionShellHtml(),
    buildExplainabilityShellHtml(),
    buildExecutiveReportShellHtml(),
    buildCompareShellHtml(),
    buildScenarioShellHtml()
  ].join('');
  main.appendChild(wrap);
}

async function showListingDetail(listing) {
  selectedListing = listing;
  const detailEl = $('ai-listings-detail');
  if (!detailEl) return;

  const id = String(listing.id);
  mountGlobalPanelHosts();
  const workspaceCtx = resolveWorkspaceContext(listing);
  detailEl.innerHTML = buildDecisionWorkspaceHtml(workspaceCtx);
  bindWorkspaceEvents(detailEl);
  renderListingsList(cachedListings);
  const mount = detailEl.querySelector('#ai-ws-detail-mount');
  if (mount) mount.innerHTML = buildListingSkeletonHtml();

  const [detailRes, eventsRes] = await Promise.all([
    edgeRequest(`/listings/${id}`),
    edgeRequest(`/listings/${id}/events`)
  ]);

  if (!detailRes.ok) {
    detailEl.innerHTML = `<p class="ai-listings-admin__error">${safeRenderText(detailRes.message)}</p>`;
    return;
  }

  const data = /** @type {Record<string, unknown>} */ (detailRes.data ?? {});
  const listingData = /** @type {Record<string, unknown>} */ (data.listing ?? listing);
  const latest = /** @type {Record<string, unknown>|null} */ (data.latest_analysis ?? null);
  const events = /** @type {Array<Record<string, unknown>>} */ (
    eventsRes.ok ? eventsRes.data?.events ?? [] : []
  );
  const status = String(listingData.status ?? 'draft');

  const matchedListingId = extractDuplicateFromEvents(events).matched_listing_id;
  const matchedListing = matchedListingId
    ? cachedListings.find((item) => String(item.id) === String(matchedListingId)) ?? { id: matchedListingId }
    : null;

  const refreshedCtx = resolveWorkspaceContext(listingData, findRecommendationForListing(listingData));
  const workspaceHost = detailEl.querySelector('.ai-decision-workspace');
  if (workspaceHost) {
    workspaceHost.outerHTML = buildDecisionWorkspaceHtml(refreshedCtx);
    bindWorkspaceEvents(detailEl);
  }

  const detailMount = detailEl.querySelector('#ai-ws-detail-mount');
  if (detailMount) {
    detailMount.innerHTML = `
      ${buildPremiumDashboardHtml(listingData, latest, events, status, matchedListing)}
      <div id="ai-listings-reject-form" class="ai-listings-admin__reject-form" hidden>
        <label>
          Red nedeni
          <textarea id="ai-listings-reject-reason" rows="3" placeholder="Bu ilanın neden reddedildiğini açıklayın"></textarea>
        </label>
        <button type="button" id="ai-listings-confirm-reject-btn" class="ai-listings-admin__btn ai-listings-admin__btn--warn">Reddi onayla</button>
        <button type="button" id="ai-listings-cancel-reject-btn" class="ai-listings-admin__btn ai-listings-admin__btn--ghost">İptal</button>
      </div>`;
  }

  detailEl.classList.add('ai-listings-admin__detail--loaded');
  requestAnimationFrame(() => detailEl.classList.remove('ai-listings-admin__detail--loaded'));
  bindDashboardTabs(detailEl);
  renderTimelineHost(listingData, latest, events);

  detailEl.querySelectorAll('[data-qa-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-qa-action');
      if (!action) return;
      if (action === 'reject') {
        $('ai-listings-reject-form')?.removeAttribute('hidden');
        return;
      }
      if (action === 'pdf') {
        handlePdfExport(listingData, latest);
        return;
      }
      if (action === 'delete-ui') {
        setStatus('Kalıcı silme bu test panelinde desteklenmiyor. Arşivlemek için Arşivle düğmesini kullanın.', 'error');
        return;
      }
      runQaAction(id, action);
    });
  });
  $('ai-listings-confirm-reject-btn')?.addEventListener('click', () => {
    const reason = $('ai-listings-reject-reason')?.value?.trim() ?? '';
    if (!reason) {
      setStatus('Red nedeni zorunludur.', 'error');
      return;
    }
    runQaAction(id, 'reject', { reason });
  });
  $('ai-listings-cancel-reject-btn')?.addEventListener('click', () => {
    $('ai-listings-reject-form')?.setAttribute('hidden', '');
    const reasonEl = $('ai-listings-reject-reason');
    if (reasonEl) reasonEl.value = '';
  });

  bindDuplicateDetailActions(detailEl);
}

function bindDuplicateDetailActions(root) {
  root.querySelectorAll('[data-duplicate-detail-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-duplicate-detail-action');
      if (action === 'open-existing') {
        const matchedId = btn.getAttribute('data-matched-listing-id');
        if (!matchedId) {
          setStatus('Eşleşen ilan kimliği bulunamadı.', 'error');
          return;
        }
        const existing = cachedListings.find((item) => String(item.id) === String(matchedId));
        if (existing) {
          showListingDetail(existing);
          const card = document.querySelector(
            `.ai-listings-admin__listing-card[data-listing-id="${CSS.escape(String(matchedId))}"]`
          );
          card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          card?.focus?.();
          setStatus('Mevcut ilan açıldı.', 'success');
          return;
        }
        setStatus('Eşleşen ilan listede bulunamadı.', 'error');
        return;
      }

      if (action === 'leave-as-new') {
        const card = root.querySelector('[data-duplicate-card]');
        card?.setAttribute('hidden', '');
        setStatus('Bu kayıt yeni ilan olarak bırakıldı.', 'info');
      }
    });
  });
}

async function runQaAction(id, action, body) {
  const labels = {
    'submit-review': 'İncelemeye gönderiliyor',
    approve: 'Onaylanıyor',
    reject: 'Reddediliyor',
    archive: 'Arşivleniyor',
    reanalyze: 'Yeniden analiz ediliyor'
  };
  setStatus(`${labels[action] ?? 'İşleniyor'}…`, 'info');

  const result = await edgeRequest(`/listings/${id}/${action}`, {
    method: 'POST',
    body
  });

  if (!result.ok) {
    setStatus(result.message, 'error');
    return;
  }

  setStatus(`${labels[action] ?? 'İşlem'} tamamlandı.`, 'success');
  const updated = result.data?.listing;
  if (updated) {
    selectedListing = updated;
    await showListingDetail(updated);
  } else if (selectedListing) {
    await showListingDetail(selectedListing);
  }
  await loadListings();
}

async function buildCreatePayload() {
  const category = $('ai-listings-create-category')?.value?.trim();
  const title = $('ai-listings-create-title')?.value?.trim();
  const description = $('ai-listings-create-description')?.value?.trim();
  const priceRaw = $('ai-listings-create-price')?.value?.trim();
  const currency = $('ai-listings-create-currency')?.value?.trim() || 'TRY';
  const sourceUrl = $('ai-listings-create-source-url')?.value?.trim();
  const attributesText = $('ai-listings-create-attributes')?.value ?? '';

  if (!category || !title) {
    return { ok: false, message: 'Kategori ve başlık zorunludur.' };
  }

  if (!validateSourceUrl(sourceUrl)) {
    return { ok: false, message: 'Geçersiz URL' };
  }

  const attrs = validateAttributesJson(attributesText);
  if (!attrs.ok) {
    return { ok: false, message: attrs.message };
  }

  /** @type {Record<string, unknown>} */
  const body = { category, title, currency, attributes: attrs.value };
  if (description) body.description = description;
  if (priceRaw) body.price = Number(priceRaw);
  if (sourceUrl) body.source_url = sourceUrl;

  return { ok: true, body };
}

/** @type {{ payload: Record<string, unknown>, duplicate: Record<string, unknown>, matchedListing: Record<string, unknown>|null }|null} */
let pendingDuplicateCreate = null;

function clearDuplicateCreateModal() {
  pendingDuplicateCreate = null;
  $('ai-listings-duplicate-modal')?.setAttribute('hidden', '');
  const host = $('ai-listings-duplicate-modal-body');
  if (host) host.innerHTML = '';
}

function showDuplicateCreateModal(candidateBody, duplicate, matchedListing, { analyzeAfter = false } = {}) {
  pendingDuplicateCreate = {
    payload: candidateBody,
    duplicate,
    matchedListing,
    analyzeAfter
  };

  let modal = $('ai-listings-duplicate-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ai-listings-duplicate-modal';
    modal.className = 'ai-listings-admin__duplicate-modal';
    modal.innerHTML = `
      <div class="ai-listings-admin__duplicate-modal-backdrop" data-duplicate-action="cancel"></div>
      <div class="ai-listings-admin__duplicate-modal-panel">
        <div id="ai-listings-duplicate-modal-body"></div>
      </div>`;
    document.body.appendChild(modal);
  }

  const host = $('ai-listings-duplicate-modal-body');
  if (host) {
    host.innerHTML = buildDuplicateCheckCardHtml(
      { title: candidateBody.title, ...candidateBody },
      matchedListing ?? { title: '—' },
      duplicate
    );
  }

  modal.removeAttribute('hidden');
  modal.querySelectorAll('[data-duplicate-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-duplicate-action');
      if (action) handleDuplicateCreateAction(action);
    });
  });
}

async function finalizeCreateListing(body, { analyzeAfter = false } = {}) {
  setStatus('İlan oluşturuluyor…', 'info');
  const result = await edgeRequest('/listings', { method: 'POST', body });
  if (!result.ok) {
    setStatus(result.message, 'error');
    return null;
  }

  const form = $('ai-listings-create-form');
  form?.reset();
  closeCreateDrawer();
  clearDuplicateCreateModal();

  const listing = result.data?.listing;
  if (!listing) {
    setStatus('Kayıt tamamlandı.', 'success');
    await loadListings();
    return null;
  }

  if (analyzeAfter) {
    setStatus('İlan kaydedildi. Analiz başlatılıyor…', 'success');
    await autoAnalyzeListing(listing);
    return listing;
  }

  setStatus('Kayıt tamamlandı.', 'success');
  await loadListings();
  await showListingDetail(listing);
  return listing;
}

async function handleDuplicateCreateAction(action) {
  if (!pendingDuplicateCreate) return;

  const { payload, matchedListing } = pendingDuplicateCreate;

  if (action === 'cancel') {
    clearDuplicateCreateModal();
    setStatus('İlan oluşturma iptal edildi.', 'info');
    return;
  }

  if (action === 'open-existing' && matchedListing?.id) {
    clearDuplicateCreateModal();
    closeCreateDrawer();
    const existing = cachedListings.find((item) => String(item.id) === String(matchedListing.id));
    if (existing) {
      await showListingDetail(existing);
      setStatus('Mevcut ilan açıldı.', 'success');
      return;
    }
    setStatus('Eşleşen ilan listede bulunamadı.', 'error');
    return;
  }

  if (action === 'update-existing' && matchedListing?.id) {
    clearDuplicateCreateModal();
    setStatus('Mevcut ilan güncelleniyor…', 'info');
    const result = await edgeRequest(`/listings/${matchedListing.id}`, {
      method: 'PATCH',
      body: payload
    });
    if (!result.ok) {
      setStatus(result.message, 'error');
      return;
    }
    closeCreateDrawer();
    $('ai-listings-create-form')?.reset();
    await loadListings();
    const updated = result.data?.listing;
    if (updated) await showListingDetail(updated);
    setStatus('Mevcut ilan güncellendi.', 'success');
    return;
  }

  if (action === 'create-new') {
    const analyzeAfter = pendingDuplicateCreate.analyzeAfter === true;
    clearDuplicateCreateModal();
    await finalizeCreateListing(payload, { analyzeAfter });
  }
}

async function handleCreateSubmit(event, { analyzeAfter = false } = {}) {
  event?.preventDefault?.();

  const payload = await buildCreatePayload();
  if (!payload.ok) {
    setStatus(payload.message, 'error');
    return null;
  }

  const duplicate = runDuplicateEngine(payload.body, cachedListings);
  if (duplicate.status !== 'new' && duplicate.matched_listing) {
    showDuplicateCreateModal(payload.body, duplicate, duplicate.matched_listing, { analyzeAfter });
    setStatus('Benzer ilan tespit edildi. Lütfen bir işlem seçin.', 'info');
    return null;
  }

  return finalizeCreateListing(payload.body, { analyzeAfter });
}

function updateImportButtonState() {
  const importBtn = $('ai-listings-import-run-btn');
  if (!importBtn) return;
  importBtn.disabled = importValidRowCount <= 0;
}

function setImportFormat(format) {
  const select = $('ai-listings-import-format');
  if (select) select.value = format;
  document.querySelectorAll('[data-import-format-tab]').forEach((tab) => {
    const isActive = tab.getAttribute('data-import-format-tab') === format;
    tab.classList.toggle('ai-listings-admin__format-tab--active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function handleImportPreview() {
  const format = /** @type {'csv'|'json'} */ (
    $('ai-listings-import-format')?.value === 'json' ? 'json' : 'csv'
  );
  const content = $('ai-listings-import-content')?.value ?? '';
  const previewEl = $('ai-listings-import-preview');

  const result = previewImportContent(format, content);
  if (!result.ok) {
    importValidRowCount = 0;
    updateImportButtonState();
    if (previewEl) previewEl.innerHTML = `<p class="ai-listings-admin__error">${safeRenderText(result.message)}</p>`;
    setStatus(result.message, 'error');
    return;
  }

  importValidRowCount = result.preview.valid_rows ?? 0;
  acquisitionResult = result.acquisition ?? result.preview;
  updateImportButtonState();
  if (previewEl) previewEl.innerHTML = buildImportPreviewHtml(result.preview);
  setStatus(
    `Önizleme hazır: ${result.preview.valid_rows} geçerli, ${result.preview.invalid_rows} hatalı, ${result.preview.duplicate_candidates ?? 0} duplicate adayı.`,
    'success'
  );
}

function handleAcquisitionActionClick(event) {
  const target = /** @type {HTMLElement|null} */ (event.target instanceof HTMLElement ? event.target.closest('[data-acquisition-action]') : null);
  if (!target || !acquisitionResult) return;

  const action = target.getAttribute('data-acquisition-action');
  if (action === 'save') {
    void handleAcquisitionImport(false);
  } else if (action === 'save-analyze') {
    void handleAcquisitionImport(true);
  } else if (action === 'copy-errors') {
    handleCopyAcquisitionErrors();
  } else if (action === 'download-errors') {
    handleDownloadAcquisitionErrors();
  }
}

async function handleAcquisitionImport(analyzeAfter) {
  if (!acquisitionResult?.normalized_rows?.length) {
    setStatus('Kaydedilecek geçerli satır yok. Önce önizleme yapın.', 'error');
    return;
  }

  const rows = /** @type {Record<string, unknown>[]} */ (acquisitionResult.normalized_rows);
  setStatus('Geçerli kayıtlar içe aktarılıyor…', 'info');

  let created = 0;
  let invalid = 0;
  let analyzed = 0;

  for (let offset = 0; offset < rows.length; offset += IMPORT_MAX_ROWS) {
    const chunk = rows.slice(offset, offset + IMPORT_MAX_ROWS);
    const result = await edgeRequest('/listings/import', {
      method: 'POST',
      body: { format: 'json', content: JSON.stringify(chunk), analyze: analyzeAfter }
    });

    if (!result.ok) {
      setStatus(result.message, 'error');
      console.info('[acquisition]', buildAcquisitionEventPayload('acquisition_failed', acquisitionResult, { message: result.message }));
      return;
    }

    const summary = result.data ?? {};
    created += Number(summary.created_count ?? 0);
    invalid += Number(summary.invalid_count ?? 0);
    analyzed += Number(summary.analyzed_count ?? 0);
  }

  console.info(
    '[acquisition]',
    buildAcquisitionEventPayload('acquisition_imported', acquisitionResult, {
      created_count: created,
      analyzed_count: analyzed
    })
  );

  setStatus(
    `Veri alma tamamlandı: ${created} kayıt oluşturuldu, ${invalid} geçersiz, ${analyzed} analiz edildi.`,
    'success'
  );
  acquisitionResult = null;
  importValidRowCount = 0;
  updateImportButtonState();
  closeImportDrawer();
  await loadListings();
}

function handleCopyAcquisitionErrors() {
  if (!acquisitionResult) return;
  const text = buildAcquisitionErrorsExportText(acquisitionResult);
  if (!text) {
    setStatus('Kopyalanacak hata yok.', 'info');
    return;
  }
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).then(() => {
      setStatus('Hatalar panoya kopyalandı.', 'success');
    });
    return;
  }
  setStatus(text, 'info');
}

function handleDownloadAcquisitionErrors() {
  if (!acquisitionResult) return;
  const text = buildAcquisitionErrorsExportText(acquisitionResult);
  if (!text) {
    setStatus('İndirilecek hata yok.', 'info');
    return;
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'ai-listings-acquisition-errors.txt';
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus('Hata raporu indirildi.', 'success');
}

async function handleImportRun() {
  if (importValidRowCount <= 0) {
    setStatus('İçe aktarılacak geçerli satır yok. Önce önizleme yapın.', 'error');
    return;
  }

  const format = /** @type {'csv'|'json'} */ (
    $('ai-listings-import-format')?.value === 'json' ? 'json' : 'csv'
  );
  const content = $('ai-listings-import-content')?.value ?? '';
  const analyze = resolveImportAnalyzeFlag($('ai-listings-import-analyze')?.checked);

  setStatus('İlanlar içe aktarılıyor…', 'info');
  const result = await edgeRequest('/listings/import', {
    method: 'POST',
    body: { format, content, analyze }
  });

  if (!result.ok) {
    setStatus(result.message, 'error');
    return;
  }

  const summary = result.data ?? {};
  setStatus(
    `İçe aktarım tamamlandı: ${summary.created_count ?? 0} oluşturuldu, ${summary.invalid_count ?? 0} geçersiz, ${summary.analyzed_count ?? 0} analiz edildi.`,
    'success'
  );
  importValidRowCount = 0;
  acquisitionResult = null;
  updateImportButtonState();
  closeImportDrawer();
  await loadListings();
}

function handleImportFileSelect(event) {
  const input = /** @type {HTMLInputElement|null} */ (event.target);
  const file = input?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const content = String(reader.result ?? '');
    const textarea = $('ai-listings-import-content');
    if (textarea) textarea.value = content;
    const format = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
    setImportFormat(format);
    importValidRowCount = 0;
    acquisitionResult = null;
    updateImportButtonState();
    setStatus(`${file.name} dosyası yüklendi.`, 'success');
  };
  reader.readAsText(file);
}

function bindEvents() {
  $('ai-listings-refresh-list-btn')?.addEventListener('click', () => loadListings());
  $('ai-listings-drawer-close')?.addEventListener('click', closeCreateDrawer);
  $('ai-listings-import-drawer-close')?.addEventListener('click', closeImportDrawer);
  $('ai-listings-builder-drawer-close')?.addEventListener('click', closeBuilderDrawer);
  $('ai-listings-drawer-backdrop')?.addEventListener('click', closeAllDrawers);

  $('ai-listings-new-menu-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleNewMenu();
  });

  document.querySelectorAll('[data-menu-action]').forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-menu-action');
      closeNewMenu();
      if (action === 'create') openCreateDrawer();
      if (action === 'ai-builder') openBuilderDrawer();
      if (action === 'import-csv') openImportDrawer('csv');
      if (action === 'import-json') openImportDrawer('json');
    });
  });

  $('ai-listings-filter-toggle')?.addEventListener('click', () => toggleFilterPanel());

  $('ai-listings-search')?.addEventListener('input', (event) => {
    searchQuery = /** @type {HTMLInputElement} */ (event.target).value;
    if (activeAdminView === 'repository') {
      renderRepositoryView();
      renderRepositoryKpiCards(cachedListings);
    } else if (activeAdminView === 'analytics') {
      renderAnalyticsView();
      renderAnalyticsKpiCards(cachedListings);
    } else {
      renderListingsList(cachedListings);
    }
  });

  document.querySelectorAll('[data-admin-view]').forEach((tab) => {
    tab.addEventListener('click', () => {
      setAdminView(tab.getAttribute('data-admin-view') ?? 'decision');
    });
  });

  ['ai-listings-filter-category', 'ai-listings-filter-source', 'ai-listings-filter-limit'].forEach((id) => {
    $(id)?.addEventListener('change', () => loadListings());
    $(id)?.addEventListener('keydown', (event) => {
      if (/** @type {KeyboardEvent} */ (event).key === 'Enter') loadListings();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllDrawers();
  });

  document.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    if (!target.closest('.ai-listings-admin__menu-wrap')) closeNewMenu();
  });
}

export function initAiListingsAdmin() {
  const state = getAdminPanelState(storage());

  if (state === 'disabled') {
    renderDisabledState();
    return;
  }

  if (state === 'no-secret') {
    renderSecretWarning();
  }

  renderStatusFilterChips();
  mountGlobalPanelHosts();
  bindEvents();
  setAdminView('decision');
  loadListings();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAiListingsAdmin);
} else {
  initAiListingsAdmin();
}
