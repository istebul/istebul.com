import { escapeHtml } from '../../core/security.js';

export function renderUserSidebar({ profileName, profileEmail, activeTab, notifications = 0, initials = 'IB', hasPremium = false }) {
  const items = [
    { id: 'overview', label: 'Genel Bakış', icon: 'layout-dashboard' },
    { id: 'analyses', label: 'Analizlerim', icon: 'line-chart' },
    { id: 'favorites', label: 'Favorilerim', icon: 'heart' },
    { id: 'comparisons', label: 'Karşılaştırmalarım', icon: 'scale' },
    { id: 'recommendations', label: 'AI Önerilerim', icon: 'sparkles' },
    { id: 'notifications', label: 'Bildirimler', icon: 'bell', badge: notifications },
    { id: 'settings', label: 'Profil Ayarları', icon: 'user-cog' },
    { id: 'security', label: 'Hesap Güvenliği', icon: 'shield-check' },
    { id: 'help', label: 'Yardım & Destek', icon: 'circle-help' }
  ];

  return `
    <aside class="ud-sidebar" id="user-dashboard-sidebar" aria-label="Kişisel panel menüsü">
      <div class="ud-sidebar-brand">
        <span>${escapeHtml(initials)}</span>
        <div>
          <strong>isteBul</strong>
          <small>AI Karar Merkezi</small>
        </div>
      </div>
      <nav class="ud-sidebar-nav">
        ${items.map((item) => `
          <button type="button" class="ud-nav-item ${activeTab === item.id ? 'is-active' : ''}" data-dashboard-tab="${escapeHtml(item.id)}">
            <i data-lucide="${escapeHtml(item.icon)}" aria-hidden="true"></i>
            <span>${escapeHtml(item.label)}</span>
            ${item.badge ? `<small>${escapeHtml(String(item.badge))}</small>` : ''}
          </button>
        `).join('')}
      </nav>
      <section class="ud-premium-card">
        <h3>Premium Üyelik</h3>
        <p>Daha fazla analiz, gelişmiş AI önerileri ve öncelikli destek.</p>
        <button type="button" class="btn btn-primary btn-sm" id="account-upgrade-btn" ${hasPremium ? 'disabled' : ''}>${hasPremium ? 'Aktif Üyelik' : 'Üyeliği Yükselt'}</button>
      </section>
      <div class="ud-sidebar-user">
        <div class="ud-sidebar-avatar">${escapeHtml(initials)}</div>
        <div>
          <strong>${escapeHtml(profileName || 'Kullanıcı')}</strong>
          <small>${escapeHtml(profileEmail || '')}</small>
        </div>
      </div>
    </aside>
  `;
}
