import { escapeHtml } from '../../core/security.js';

export function renderUserAiRecommendationsPanel({ recommendations = [], profileSummary, quickActions = [] }) {
  const recMarkup = recommendations.length
    ? recommendations.map((item) => `
      <article class="ud-rec-item">
        <h4>${escapeHtml(item.title || 'AI Önerisi')}</h4>
        <p>${escapeHtml(item.description || '')}</p>
        ${item.href ? `<a href="${escapeHtml(item.href)}">Detayları Gör →</a>` : ''}
      </article>
    `).join('')
    : '<p class="ud-empty-note">Henüz yeterli analiz verisi yok. Yeni analiz tamamlandığında kişisel AI önerileri burada görünecek.</p>';

  return `
    <div class="ud-side-stack">
      <section class="ud-side-card">
        <div class="ud-side-head">
          <h3>AI Önerilerim</h3>
        </div>
        ${recMarkup}
        <p class="ud-disclaimer">Bilgilendirme amaçlıdır, kesin finansal tavsiye değildir.</p>
      </section>
      <section class="ud-side-card">
        <div class="ud-side-head">
          <h3>Hızlı İşlemler</h3>
        </div>
        <div class="ud-quick-list">
          ${quickActions.map((action) => `
            <a class="ud-quick-item" href="${escapeHtml(action.href || '/')}">
              <i data-lucide="${escapeHtml(action.icon || 'arrow-right')}" aria-hidden="true"></i>
              <div><strong>${escapeHtml(action.title)}</strong><span>${escapeHtml(action.description || '')}</span></div>
            </a>
          `).join('')}
        </div>
      </section>
      <section class="ud-side-card">
        <div class="ud-side-head">
          <h3>Profil Bilgilerim</h3>
          <button type="button" class="btn btn-ghost btn-sm" data-dashboard-tab="settings">Profilimi Düzenle</button>
        </div>
        <ul class="ud-profile-list">
          <li><span>Ad Soyad</span><strong>${escapeHtml(profileSummary.fullName || '—')}</strong></li>
          <li><span>E-posta</span><strong>${escapeHtml(profileSummary.email || '—')}</strong></li>
          <li><span>Telefon</span><strong>${escapeHtml(profileSummary.phone || '—')}</strong></li>
          <li><span>Üyelik</span><strong>${escapeHtml(profileSummary.membership || 'Ücretsiz')}</strong></li>
        </ul>
      </section>
    </div>
  `;
}
