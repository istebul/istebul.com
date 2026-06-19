import { escapeHtml } from '../../core/security.js';
import { renderUserSummaryCard } from '../../ui/components/user-summary-card.js';
import { renderUserDecisionCard, renderEmptyDecisionCard } from '../../ui/components/user-decision-card.js';
import { renderUserResultCard } from '../../ui/components/user-result-card.js';
import { renderUserSidebar } from '../../ui/components/user-sidebar.js';
import { renderUserAiRecommendationsPanel } from '../../ui/components/user-ai-recommendations.js';
import { renderUserDashboardTabPanels } from '../../ui/components/user-dashboard-panels.js';

function renderFavoritesTabs(activeFavoritesTab) {
  const tabs = [
    { id: 'arac', label: 'Araçlar' },
    { id: 'konut', label: 'Konutlar' },
    { id: 'tatil', label: 'Tatil' },
    { id: 'finans', label: 'Finansman' }
  ];
  return `
    <div class="ud-favorites-tabs">
      ${tabs.map((tab) => `
        <button type="button" class="ud-fav-tab ${activeFavoritesTab === tab.id ? 'is-active' : ''}" data-favorites-tab="${tab.id}">
          ${escapeHtml(tab.label)}
        </button>
      `).join('')}
    </div>
  `;
}

function renderFavoritesList(favorites) {
  if (!favorites.length) {
    return `
      <div class="ud-empty-card">
        <h3>Bu kategoride favori yok.</h3>
        <p>Analizlerinizden sonuçları favoriye eklediğinizde burada görüntülenecek.</p>
        <a href="/favoriler" class="btn btn-outline btn-sm">Favori Listemi Gör</a>
      </div>
    `;
  }

  return `
    <div class="ud-favorites-grid">
      ${favorites.map((item) => `
        <article class="ud-favorite-card">
          <h4>${escapeHtml(item.title || item.name || 'Favori öğe')}</h4>
          <p>${escapeHtml(item.categoryLabel || 'Kategori bilgisi yok')}</p>
          <p><strong>${escapeHtml(item.priceLabel || 'Maliyet belirtilmedi')}</strong></p>
          <small>${escapeHtml(item.detail || 'Kısa detay bulunmuyor')}</small>
          <div class="ud-favorite-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-dashboard-remove-favorite="${escapeHtml(String(item.id || ''))}">Favoriden Çıkar</button>
            <button type="button" class="btn btn-outline btn-sm" data-dashboard-compare-favorite="${escapeHtml(String(item.id || ''))}">Karşılaştırmaya Ekle</button>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderHousingAnalysesPanel(housingAnalyses = []) {
  if (!housingAnalyses.length) {
    return `
      <div class="ud-block ud-housing-block">
        <header><h2>Konut Analizlerim</h2><a href="/konut/">Yeni analiz</a></header>
        <p class="ud-empty-note">Henüz kayıtlı konut analizi yok. Konut karar asistanında analiz oluşturup raporu kaydedebilirsiniz.</p>
        <a href="/konut/" class="btn btn-primary btn-sm">Konut analizini başlat</a>
      </div>`;
  }
  return `
    <div class="ud-block ud-housing-block">
      <header><h2>Konut Analizlerim</h2><a href="/konut/">Yeni analiz</a></header>
      <div class="ud-results-grid">
        ${housingAnalyses.map((result) => renderUserResultCard(result)).join('')}
      </div>
    </div>`;
}

function renderSectionPanels({ activeTab, ongoingCards, resultCards, housingAnalyses, favorites, activeFavoritesTab }) {
  const activeFavorites = favorites[activeFavoritesTab] || [];
  return `
    <section class="ud-panel ${activeTab === 'overview' ? 'is-active' : ''}" data-dashboard-panel="overview" ${activeTab === 'overview' ? '' : 'hidden'}>
      <div class="ud-block">
        <header><h2>Devam Eden Kararlarım</h2><a href="/gecmis">Tümünü Gör</a></header>
        <div class="ud-decision-grid">
          ${ongoingCards.length ? ongoingCards.map((card) => renderUserDecisionCard(card)).join('') : renderEmptyDecisionCard()}
        </div>
      </div>
      <div class="ud-block">
        <header><h2>Kaydettiğim Sonuçlar</h2><a href="/gecmis">Tümünü Gör</a></header>
        <div class="ud-results-grid">
          ${resultCards.length ? resultCards.map((result) => renderUserResultCard(result)).join('') : '<p class="ud-empty-note">Henüz kayıtlı analiz sonucu yok.</p>'}
        </div>
      </div>
      <div class="ud-block">
        <header><h2>Favorilerim</h2><a href="/favoriler">Tümünü Gör</a></header>
        ${renderFavoritesTabs(activeFavoritesTab)}
        ${renderFavoritesList(activeFavorites)}
      </div>
    </section>

    <section class="ud-panel ${activeTab === 'analyses' ? 'is-active' : ''}" data-dashboard-panel="analyses" ${activeTab === 'analyses' ? '' : 'hidden'}>
      ${renderHousingAnalysesPanel(housingAnalyses)}
      <div class="ud-block">
        <header><h2>Tüm Analizlerim</h2><a href="/gecmis">Geçmişi Aç</a></header>
        <div class="ud-results-grid">
          ${resultCards.length ? resultCards.map((result) => renderUserResultCard(result)).join('') : '<p class="ud-empty-note">Henüz analiz geçmişi bulunamadı.</p>'}
        </div>
      </div>
    </section>

    <section class="ud-panel ${activeTab === 'favorites' ? 'is-active' : ''}" data-dashboard-panel="favorites" ${activeTab === 'favorites' ? '' : 'hidden'}>
      <div class="ud-block">
        <header><h2>Favorilerim</h2><a href="/favoriler">Listeyi Aç</a></header>
        ${renderFavoritesTabs(activeFavoritesTab)}
        ${renderFavoritesList(activeFavorites)}
      </div>
    </section>
  `;
}

export function renderUserDashboard(payload) {
  const {
    profile,
    user,
    initials,
    activeTab,
    activeFavoritesTab,
    metrics,
    ongoingCards,
    resultCards,
    housingAnalyses = [],
    favorites,
    recommendations,
    quickActions,
    membershipLabel,
    notificationCount,
    hasPremium,
    comparisons = [],
    emailVerified = true,
    notificationPreference = 'all'
  } = payload;

  return `
    <div class="user-dashboard-shell">
      <button type="button" class="ud-sidebar-toggle" id="user-dashboard-menu-toggle" aria-controls="user-dashboard-sidebar" aria-expanded="false">
        <i data-lucide="menu" aria-hidden="true"></i>
        Menü
      </button>
      <div class="ud-sidebar-backdrop" id="user-dashboard-sidebar-backdrop" hidden></div>
      ${renderUserSidebar({
        profileName: profile?.full_name || user.email,
        profileEmail: user.email,
        activeTab,
        notifications: notificationCount,
        initials,
        hasPremium
      })}
      <div class="ud-main">
        <header class="ud-main-header" data-dashboard-overview="header">
          <div>
            <h1>Merhaba ${escapeHtml(profile?.full_name || user.email?.split('@')[0] || 'Kullanıcı')}, karar merkezine hoş geldin.</h1>
            <p>Araç, konut, tatil ve finansman kararlarınızı tek yerden takip edin.</p>
          </div>
        </header>
        <section class="ud-summary-grid" data-dashboard-overview="summary" aria-label="Karar merkezi özet kartları">
          ${metrics.map((metric) => renderUserSummaryCard(metric)).join('')}
        </section>
        <div class="ud-panels-host">
          <div class="ud-content-grid" data-dashboard-overview="grid">
            <div class="ud-primary-column">
              ${renderSectionPanels({ activeTab, ongoingCards, resultCards, housingAnalyses, favorites, activeFavoritesTab })}
            </div>
            <div data-dashboard-overview="side">
              ${renderUserAiRecommendationsPanel({
                recommendations,
                quickActions,
                profileSummary: {
                  fullName: profile?.full_name || '—',
                  email: user.email || '—',
                  phone: profile?.phone || '—',
                  membership: membershipLabel
                }
              })}
            </div>
          </div>
          ${renderUserDashboardTabPanels({
            comparisons,
            recommendations,
            emailVerified,
            profile,
            notificationPreference
          })}
        </div>
      </div>
    </div>
  `;
}
