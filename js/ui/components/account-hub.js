import { escapeHtml } from '../../core/security.js';
import { renderUserDashboardTabPanels } from './user-dashboard-panels.js';

const HUB_TABS = [
  { id: 'settings', label: 'Profil', icon: 'user-cog', hint: 'Bilgilerinizi güncelleyin' },
  { id: 'security', label: 'Güvenlik', icon: 'shield-check', hint: 'Şifre ve hesap güvenliği' },
  { id: 'notifications', label: 'Bildirimler', icon: 'bell', hint: 'Tercihlerinizi yönetin' },
  { id: 'help', label: 'Yardım', icon: 'circle-help', hint: 'Destek ve SSS' }
];

/**
 * @param {{ activeTab?: string, profile?: object, emailVerified?: boolean, notificationPreference?: string, comparisons?: object[], recommendations?: object[], membershipLabel?: string, hasPremium?: boolean }} ctx
 */
export function renderAccountHub(ctx = {}) {
  const {
    activeTab = 'settings',
    profile = {},
    emailVerified = true,
    notificationPreference = 'all',
    comparisons = [],
    recommendations = [],
    membershipLabel = 'Ücretsiz',
    hasPremium = false
  } = ctx;

  const isHubTab = HUB_TABS.some((tab) => tab.id === activeTab);
  const hubActiveTab = isHubTab ? activeTab : 'settings';

  return `
    <section class="account-hub" aria-label="Hesap yönetimi">
      <header class="account-hub-head">
        <div>
          <p class="account-hub-kicker">Hesap Yönetimi</p>
          <h2 class="account-hub-title">Profil, güvenlik ve tercihleriniz</h2>
          <p class="account-hub-lead">Tüm hesap işlemlerinizi adım adım, tek bir merkezden tamamlayın.</p>
        </div>
        <div class="account-hub-membership">
          <span class="account-plan-badge ${hasPremium ? 'tone-success' : ''}">${escapeHtml(membershipLabel)}</span>
          ${hasPremium ? '' : '<button type="button" class="btn btn-primary btn-sm" id="account-upgrade-btn">Pro&apos;ya geç</button>'}
        </div>
      </header>

      <nav class="account-hub-tabs" role="tablist" aria-label="Hesap bölümleri">
        ${HUB_TABS.map(
          (tab) => `
          <button
            type="button"
            class="account-hub-tab ${hubActiveTab === tab.id ? 'is-active' : ''}"
            data-dashboard-tab="${escapeHtml(tab.id)}"
            role="tab"
            aria-selected="${hubActiveTab === tab.id ? 'true' : 'false'}"
            aria-controls="account-hub-panel-${escapeHtml(tab.id)}"
          >
            <i data-lucide="${escapeHtml(tab.icon)}" aria-hidden="true"></i>
            <span class="account-hub-tab-label">${escapeHtml(tab.label)}</span>
            <small>${escapeHtml(tab.hint)}</small>
          </button>`
        ).join('')}
      </nav>

      <div class="account-hub-panels">
        ${renderUserDashboardTabPanels({
          comparisons,
          recommendations,
          emailVerified,
          profile,
          notificationPreference,
          panelPrefix: 'account-hub-panel'
        })}
      </div>
    </section>
  `;
}
