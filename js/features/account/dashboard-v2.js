/**
 * Dashboard V2 — Karar Merkezi (profil üst katmanı).
 */
import { escapeHtml } from '../../core/security.js';
import { downloadDecisionReport } from '../results/pdf-report.js';
import { listSavedDecisions } from '../growth/retention-saved-decisions.js';
import { mapHistoryRecordToResult } from '../../ui/components/user-result-card.js';
import {
  CATEGORY_META,
  listCompareSelections,
  listPdfReportHistory,
  normalizeDashboardCategory
} from './dashboard-v2-store.js';
import {
  buildPaywallContextFromApp,
  renderPaywallV1,
  resolvePaywallState,
  renderProBadge
} from '../billing/paywall-v1.js';
import { PRO_FEATURE } from '../billing/pro-features.js';
import { buildUserDecisionPanelHtml, bindUserDecisionPanel } from '../../user-decision-center/user-decision-panel.js';
import { renderAiPlatformBanner } from '../../ui/ai-platform-surface.js';

const EMPTY_CTAS = [
  { label: 'Araç Analizi', href: '/auto/' },
  { label: 'Konut Analizi', href: '/konut/' },
  { label: 'Tatil Analizi', href: '/tatil/' },
  { label: 'Finansman Analizi', href: '/finans/' }
];

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
}

function riskTone(level = '') {
  const l = String(level).toLowerCase();
  if (l.includes('yüksek') || l.includes('high')) return 'high';
  if (l.includes('düşük') || l.includes('low')) return 'low';
  return 'mid';
}

/**
 * @param {object} ctx
 */
export function buildDashboardV2Data(ctx = {}) {
  const userId = ctx.userId || null;
  const history = Array.isArray(ctx.history) ? ctx.history : [];
  const saved = listSavedDecisions(userId);
  const favorites = Array.isArray(ctx.favorites) ? ctx.favorites : [];
  const pdfReports = listPdfReportHistory(userId);
  const compareQueue = listCompareSelections(userId);
  const hasPremium = Boolean(ctx.hasPremium);

  const analysesMap = new Map();

  for (const record of history) {
    const cat = normalizeDashboardCategory(record.categoryId);
    const mapped = mapHistoryRecordToResult(record);
    analysesMap.set(record.id || `${cat}_${record.createdAt}`, {
      id: record.id || `hist_${record.createdAt}`,
      category: cat,
      categoryLabel: CATEGORY_META[cat]?.label || mapped.categoryLabel,
      decisionScore: Number(mapped.score) || 0,
      riskLevel: mapped.riskLevel || '—',
      dateLabel: mapped.dateLabel,
      savedAt: record.createdAt,
      href: mapped.href,
      summary: record.summary || mapped.aiSummary || '',
      source: 'history'
    });
  }

  for (const item of saved) {
    const cat = normalizeDashboardCategory(item.categoryId);
    analysesMap.set(item.id, {
      id: item.id,
      category: cat,
      categoryLabel: CATEGORY_META[cat]?.label || 'Karar',
      decisionScore: Number(item.score) || 0,
      riskLevel: '—',
      dateLabel: formatDate(item.savedAt),
      savedAt: item.savedAt,
      href: item.revisitPath || CATEGORY_META[cat]?.href || '/karar-asistani/',
      summary: item.summary || '',
      source: 'saved'
    });
  }

  const recentAnalyses = [...analysesMap.values()]
    .sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0))
    .slice(0, 12);

  const openDecisions = recentAnalyses.filter((a) => (a.decisionScore || 0) < 70).length;

  const favoritesGrouped = { auto: [], konut: [], tatil: [], finansman: [] };
  for (const fav of favorites) {
    const cat = normalizeDashboardCategory(fav.category);
    favoritesGrouped[cat].push({
      id: fav.id,
      title: fav.title || fav.name || 'Favori',
      detail: fav.location || fav.description || '',
      priceLabel: fav.price ? `${fav.price}` : ''
    });
  }

  const lastPdf = pdfReports[0] || null;

  return {
    user: ctx.user,
    profile: ctx.profile,
    hasPremium,
    membershipLabel: ctx.membershipLabel || 'Ücretsiz',
    decisionPlatform: ctx.decisionPlatform ?? {},
    summary: {
      totalAnalyses: analysesMap.size,
      lastPdfLabel: lastPdf
        ? `${CATEGORY_META[normalizeDashboardCategory(lastPdf.category)]?.label || 'Rapor'} · ${formatDate(lastPdf.savedAt)}`
        : 'Henüz PDF kaydı yok',
      favoritesCount: favorites.length,
      openDecisions,
      proLabel: hasPremium ? 'Pro aktif' : 'Ücretsiz plan'
    },
    recentAnalyses,
    pdfReports: pdfReports.slice(0, 20),
    favoritesGrouped,
    compareQueue,
    isEmpty: analysesMap.size === 0 && pdfReports.length === 0 && favorites.length === 0
  };
}

function renderEmptyState() {
  const esc = escapeHtml;
  return `
    <div class="dashboard-v2-empty">
      <h3>İlk karar analizini oluştur</h3>
      <p>Toplam maliyet, risk skoru ve AI executive summary tek merkezde toplanır.</p>
      <div class="dashboard-v2-empty-ctas">
        ${EMPTY_CTAS.map((c) => `<a href="${esc(c.href)}" class="btn btn-primary btn-sm" data-native-route>${esc(c.label)}</a>`).join('')}
      </div>
    </div>`;
}

function renderSummaryCards(summary = {}, hasPremium = false) {
  const esc = escapeHtml;
  const cards = [
    { label: 'Toplam karar analizi', value: summary.totalAnalyses ?? 0, icon: 'clipboard-list' },
    { label: 'Son PDF raporu', value: summary.lastPdfLabel || '—', icon: 'file-text', isText: true },
    { label: 'Favori seçenekler', value: summary.favoritesCount ?? 0, icon: 'heart' },
    { label: 'Açık kararlar', value: summary.openDecisions ?? 0, icon: 'alert-circle' },
    { label: 'Pro durumu', value: summary.proLabel || '—', icon: 'sparkles', isText: true, pro: true }
  ];

  return `
    <div class="dashboard-v2-summary" role="list" aria-label="Özet kartları">
      ${cards
        .map(
          (c) => `
        <article class="dashboard-v2-summary-card ${c.pro && hasPremium ? 'is-pro-active' : ''}" role="listitem">
          <i data-lucide="${esc(c.icon)}" aria-hidden="true"></i>
          <span>${esc(c.label)}</span>
          <strong class="${c.isText ? 'dashboard-v2-summary-text' : ''}">${esc(String(c.value))}</strong>
        </article>`
        )
        .join('')}
    </div>`;
}

function renderAnalysisCard(item) {
  const esc = escapeHtml;
  const meta = CATEGORY_META[item.category] || CATEGORY_META.auto;
  return `
    <article class="dashboard-v2-analysis-card" data-category="${esc(item.category)}">
      <header>
        <span class="dashboard-v2-cat-badge">${esc(item.categoryLabel || meta.label)}</span>
        <span class="ib-ai-badge">AI analiz</span>
        <time datetime="${esc(item.savedAt || '')}">${esc(item.dateLabel || formatDate(item.savedAt))}</time>
      </header>
      <div class="dashboard-v2-analysis-scores">
        <div><span>Karar skoru</span><strong>${esc(String(item.decisionScore))}/100</strong></div>
        <div><span>Risk</span><strong class="dashboard-v2-risk dashboard-v2-risk--${esc(riskTone(item.riskLevel))}">${esc(item.riskLevel)}</strong></div>
      </div>
      <p class="dashboard-v2-analysis-summary">${esc(item.summary || 'Özet kaydedildi.')}</p>
      <div class="dashboard-v2-card-actions">
        <a href="${esc(item.href || meta.href)}" class="btn btn-outline btn-sm" data-native-route data-dashboard-v2-open>Raporu aç</a>
        <button type="button" class="btn btn-ghost btn-sm" data-dashboard-v2-compare="${esc(item.id)}" data-category="${esc(item.category)}" data-title="${esc(item.categoryLabel)}" data-score="${esc(String(item.decisionScore))}" data-risk="${esc(item.riskLevel)}" data-href="${esc(item.href || meta.href)}">Karşılaştırmaya ekle</button>
      </div>
    </article>`;
}

function renderPdfRow(report) {
  const esc = escapeHtml;
  const cat = normalizeDashboardCategory(report.category);
  const meta = CATEGORY_META[cat] || CATEGORY_META.auto;
  const score = report.decisionScore != null ? `${report.decisionScore}/100` : '—';
  return `
    <tr>
      <td>${esc(meta.label)}</td>
      <td>${esc(formatDate(report.savedAt))}</td>
      <td>${esc(score)}</td>
      <td class="dashboard-v2-risk dashboard-v2-risk--${esc(riskTone(report.overallRisk))}">${esc(report.overallRisk || '—')}</td>
      <td>
        <button type="button" class="btn btn-outline btn-sm" data-dashboard-v2-redownload="${esc(report.id)}">Yeniden indir</button>
      </td>
    </tr>`;
}

function renderFavoritesSection(grouped) {
  const esc = escapeHtml;
  const blocks = ['auto', 'konut', 'tatil', 'finansman']
    .map((cat) => {
      const items = grouped[cat] || [];
      const meta = CATEGORY_META[cat];
      if (!items.length) {
        return `<div class="dashboard-v2-fav-group"><h4>${esc(meta.label)}</h4><p class="dashboard-v2-muted">Bu kategoride favori yok.</p></div>`;
      }
      return `
        <div class="dashboard-v2-fav-group">
          <h4>${esc(meta.label)}</h4>
          <ul>
            ${items
              .map(
                (f) => `
              <li>
                <strong>${esc(f.title)}</strong>
                <span>${esc(f.detail || '')}</span>
                <button type="button" class="btn btn-ghost btn-sm" data-dashboard-remove-favorite="${esc(String(f.id))}">Kaldır</button>
              </li>`
              )
              .join('')}
          </ul>
        </div>`;
    })
    .join('');

  return blocks;
}

/**
 * @param {ReturnType<typeof buildDashboardV2Data>} data
 */
export function renderDashboardV2(data) {
  const esc = escapeHtml;
  const user = data.user || {};
  const name = data.profile?.full_name || user.email?.split('@')[0] || 'Kullanıcı';
  const paywallCtx = buildPaywallContextFromApp({
    isPro: data.hasPremium,
    profile: data.profile,
    user: data.user
  });
  const pdfPaywallState = resolvePaywallState(paywallCtx);
  const pdfPaywallHtml =
    pdfPaywallState !== 'pro'
      ? renderPaywallV1({ feature: PRO_FEATURE.PDF_HISTORY, state: pdfPaywallState, compact: true })
      : '';

  return `
    <div class="dashboard-v2-root" data-dashboard-v2>
      <header class="dashboard-v2-hero">
        <div>
          <p class="dashboard-v2-kicker">Karar Merkezi · Yapay Zeka Destekli</p>
          <h2 class="dashboard-v2-title">Merhaba ${esc(name)}, kararlarınız tek panelde</h2>
          <p class="dashboard-v2-lead">Son analizler, PDF geçmişi, favoriler ve karşılaştırma seçimleriniz — AI executive summary ile.</p>
          ${renderAiPlatformBanner({
            title: 'isteBul Karar Merkezi',
            subtitle: 'Her analiz yapay zeka destekli karar motoru ile skorlanır; geçmişiniz burada yaşar.',
            variant: 'compact'
          })}
        </div>
        <a href="/karsilastir" class="btn btn-outline btn-sm dashboard-v2-hero-cta" data-native-route>Karşılaştırma merkezi</a>
        <button type="button" class="btn btn-outline btn-sm dashboard-v2-hero-cta" data-dashboard-tab="settings">Hesap ayarları</button>
      </header>

      ${renderSummaryCards(data.summary, data.hasPremium)}

      <section class="dashboard-v2-section dashboard-v2-decision-platform" aria-label="Karar Merkezi paneli">
        ${buildUserDecisionPanelHtml(data.decisionPlatform ?? {})}
      </section>

      ${data.isEmpty ? renderEmptyState() : ''}

      <section class="dashboard-v2-section" aria-labelledby="dashboard-v2-recent-title">
        <div class="dashboard-v2-section-head">
          <h3 id="dashboard-v2-recent-title">Son karar analizleri</h3>
        </div>
        <div class="dashboard-v2-analysis-grid">
          ${
            data.recentAnalyses.length
              ? data.recentAnalyses.map(renderAnalysisCard).join('')
              : '<p class="dashboard-v2-muted">Henüz kayıtlı analiz yok.</p>'
          }
        </div>
      </section>

      <section class="dashboard-v2-section ${!data.hasPremium ? 'dashboard-v2-pro-locked' : ''}" aria-labelledby="dashboard-v2-pdf-title">
        <div class="dashboard-v2-section-head">
          <h3 id="dashboard-v2-pdf-title">PDF rapor geçmişi ${data.hasPremium ? renderProBadge({ active: true }) : ''}</h3>
        </div>
        ${pdfPaywallHtml}
        <div class="dashboard-v2-table-wrap">
          <table class="dashboard-v2-table">
            <thead>
              <tr><th>Kategori</th><th>Tarih</th><th>Karar skoru</th><th>Risk</th><th></th></tr>
            </thead>
            <tbody>
              ${
                data.pdfReports.length
                  ? data.pdfReports.map(renderPdfRow).join('')
                  : '<tr><td colspan="5" class="dashboard-v2-muted">Henüz indirilen rapor yok. Analiz sonrası PDF indirdiğinizde burada listelenir.</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="dashboard-v2-section" aria-labelledby="dashboard-v2-fav-title">
        <h3 id="dashboard-v2-fav-title">Favoriler</h3>
        <div class="dashboard-v2-favorites">${renderFavoritesSection(data.favoritesGrouped)}</div>
      </section>

      <section class="dashboard-v2-section" aria-labelledby="dashboard-v2-compare-title">
        <div class="dashboard-v2-section-head">
          <h3 id="dashboard-v2-compare-title">Karşılaştırmaya ekle</h3>
          <a href="/karsilastir" class="btn btn-primary btn-sm" data-native-route>Merkeze git</a>
        </div>
        ${
          data.compareQueue.length
            ? `<ul class="dashboard-v2-compare-list">
            ${data.compareQueue
              .map(
                (c) => `
              <li>
                <span>${esc(CATEGORY_META[c.category]?.label || c.category)} · ${esc(c.title)} · ${esc(String(c.decisionScore ?? '—'))}/100</span>
                <button type="button" class="btn btn-ghost btn-sm" data-dashboard-v2-remove-compare="${esc(c.id)}">Kaldır</button>
              </li>`
              )
              .join('')}
          </ul>`
            : '<p class="dashboard-v2-muted">Analiz kartlarından “Karşılaştırmaya ekle” ile seçim yapın.</p>'
        }
      </section>

      <section class="dashboard-v2-pro ${data.hasPremium ? 'is-active' : ''}" aria-label="Pro durumu">
        ${
          data.hasPremium
            ? `<p><i data-lucide="badge-check" aria-hidden="true"></i> <strong>Pro aktif</strong> — Sınırsız rapor, gelişmiş karşılaştırma ve PDF geçmişi kullanılabilir.</p>`
            : `<p><strong>Pro ile</strong> sınırsız rapor, gelişmiş karşılaştırma ve PDF geçmişi.</p>
             <button type="button" class="btn btn-primary btn-sm" id="account-upgrade-btn" data-payment-product="pro_monthly">Pro&apos;ya geç</button>`
        }
      </section>
    </div>`;
}

export function renderDashboardV2Guest() {
  const esc = escapeHtml;
  return `
    <div class="dashboard-v2-root dashboard-v2-root--guest" data-dashboard-v2>
      <div class="dashboard-v2-guest">
        <p class="dashboard-v2-kicker">Karar Merkezi</p>
        <h2 class="dashboard-v2-title">Karar geçmişinizi tek yerde görün</h2>
        <p class="dashboard-v2-lead">Giriş yaptığınızda analizler, PDF raporları ve favoriler burada toplanır.</p>
        <div class="dashboard-v2-guest-actions">
          <button type="button" class="btn btn-primary" id="account-login-btn">Hesabına gir</button>
          <button type="button" class="btn btn-outline" data-auth-open="register">Kayıt ol</button>
        </div>
        <div class="dashboard-v2-empty-ctas">
          ${EMPTY_CTAS.map((c) => `<a href="${esc(c.href)}" class="btn btn-outline btn-sm" data-native-route>${esc(c.label)}</a>`).join('')}
        </div>
      </div>
    </div>`;
}

/**
 * @param {HTMLElement} root
 * @param {object} ctx
 */
export function bindDashboardV2(root, ctx = {}) {
  if (!root) return;

  const decisionPanel = root.querySelector('[data-udc-panel]');
  if (decisionPanel) {
    bindUserDecisionPanel(decisionPanel, {
      onTabChange: (tab) => {
        if (typeof ctx.onDecisionTabChange === 'function') ctx.onDecisionTabChange(tab);
      }
    });
  }

  root.addEventListener('click', (event) => {
    const compareBtn = event.target.closest('[data-dashboard-v2-compare]');
    if (compareBtn) {
      event.preventDefault();
      const { addAnalysisToCompareSelection } = ctx.store || {};
      if (typeof addAnalysisToCompareSelection === 'function') {
        addAnalysisToCompareSelection(
          {
            id: compareBtn.dataset.dashboardV2Compare,
            category: compareBtn.dataset.category,
            title: compareBtn.dataset.title,
            decisionScore: Number(compareBtn.dataset.score),
            riskLevel: compareBtn.dataset.risk,
            href: compareBtn.dataset.href
          },
          ctx.userId
        );
        ctx.onRefresh?.();
        ctx.ui?.showSuccess?.('Analiz karşılaştırma seçimine eklendi.');
      }
      return;
    }

    const removeCompare = event.target.closest('[data-dashboard-v2-remove-compare]');
    if (removeCompare?.dataset.dashboardV2RemoveCompare) {
      event.preventDefault();
      ctx.store?.removeCompareSelection?.(removeCompare.dataset.dashboardV2RemoveCompare, ctx.userId);
      ctx.onRefresh?.();
      return;
    }

    const redownload = event.target.closest('[data-dashboard-v2-redownload]');
    if (redownload?.dataset.dashboardV2Redownload) {
      event.preventDefault();
      const report = (ctx.pdfReports || []).find((r) => r.id === redownload.dataset.dashboardV2Redownload);
      if (report?.snapshot) {
        try {
          downloadDecisionReport(report.snapshot);
          ctx.ui?.showSuccess?.('Rapor penceresi açıldı.');
        } catch {
          ctx.ui?.showError?.('Rapor yeniden oluşturulamadı.');
        }
      }
    }
  });
}
