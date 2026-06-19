import { escapeHtml } from '../../core/security.js';

function renderActionCard({ icon, title, description, actionHtml, tone = 'default' }) {
  return `
    <article class="account-action-card account-action-card--${escapeHtml(tone)}">
      <div class="account-action-icon" aria-hidden="true">
        <i data-lucide="${escapeHtml(icon)}"></i>
      </div>
      <div class="account-action-body">
        <h3>${escapeHtml(title)}</h3>
        <p>${description}</p>
      </div>
      <div class="account-action-cta">${actionHtml}</div>
    </article>`;
}

function renderHelpCard({ icon, title, description, href, external = false }) {
  const attrs = external ? 'target="_blank" rel="noopener noreferrer"' : 'data-native-route';
  return `
    <a href="${escapeHtml(href)}" class="account-help-card" ${attrs}>
      <i data-lucide="${escapeHtml(icon)}" aria-hidden="true"></i>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(description)}</span>
      </div>
      <i data-lucide="arrow-right" class="account-help-arrow" aria-hidden="true"></i>
    </a>`;
}

/**
 * @param {{ comparisons?: object[], recommendations?: object[], emailVerified?: boolean, profile?: object, notificationPreference?: string, panelPrefix?: string }} ctx
 */
export function renderUserDashboardTabPanels(ctx = {}) {
  const {
    comparisons = [],
    recommendations = [],
    emailVerified = true,
    profile = {},
    notificationPreference = 'all',
    panelPrefix = ''
  } = ctx;

  const panelId = (name) => (panelPrefix ? `${panelPrefix}-${name}` : name);

  return `
    <section class="ud-panel ud-tab-panel account-hub-panel" id="${panelId('comparisons')}" data-dashboard-panel="comparisons" hidden role="tabpanel">
      <header class="account-panel-head">
        <h2>Karşılaştırmalarım</h2>
        <p>Kaydettiğiniz seçenekleri tek merkezde yönetin.</p>
      </header>
      ${
        comparisons.length
          ? `<ul class="ud-comparison-list">${comparisons
              .map(
                (item) => `
          <li class="ud-comparison-item">
            <div>
              <strong>${escapeHtml(item.title || item.name || 'Karşılaştırma öğesi')}</strong>
              <p>${escapeHtml(item.categoryName || item.categoryId || 'Kategori')}</p>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" data-comparison-remove="${escapeHtml(String(item.id || item.signature || ''))}">Kaldır</button>
          </li>`
              )
              .join('')}</ul>`
          : '<p class="ud-empty-note">Henüz karşılaştırma listesine öğe eklemediniz. Analiz sonuçlarından veya favorilerden ekleyebilirsiniz.</p>'
      }
      <div class="account-quick-actions">
        <a href="/karsilastir" class="btn btn-primary">Karşılaştırma Merkezine Git</a>
        <a href="/karar-asistani/" class="btn btn-outline">Ön değerlendirmeye başla</a>
      </div>
    </section>

    <section class="ud-panel ud-tab-panel account-hub-panel" id="${panelId('recommendations')}" data-dashboard-panel="recommendations" hidden role="tabpanel">
      <header class="account-panel-head">
        <h2>AI Önerilerim</h2>
        <p>Kayıtlı analizlerinize göre bilgilendirme amaçlı öneriler.</p>
      </header>
      ${
        recommendations.length
          ? `<div class="ud-side-stack">${recommendations
              .map(
                (item) => `
          <article class="ud-rec-item">
            <h4>${escapeHtml(item.title)}</h4>
            <p>${escapeHtml(item.description)}</p>
            ${item.href ? `<a href="${escapeHtml(item.href)}">Detayları Gör →</a>` : ''}
          </article>`
              )
              .join('')}</div>`
          : '<p class="ud-empty-note">Henüz AI önerisi oluşturacak yeterli veri yok. Bir analiz tamamladığınızda öneriler burada görünür.</p>'
      }
      <p class="ud-disclaimer">Bilgilendirme amaçlıdır; kesin finansal tavsiye değildir.</p>
    </section>

    <section class="ud-panel ud-tab-panel account-hub-panel" id="${panelId('notifications')}" data-dashboard-panel="notifications" hidden role="tabpanel">
      <header class="account-panel-head">
        <h2>Bildirimler</h2>
        <p>Karar durum güncellemeleri ve hesap bildirimleri.</p>
      </header>
      <div class="account-action-grid account-action-grid--single">
        ${renderActionCard({
          icon: 'bell-ring',
          title: 'Bildirim tercihi',
          description: 'Hangi güncellemeleri almak istediğinizi seçin. Değişiklikler anında kaydedilir.',
          actionHtml: `
            <select id="account-notification-preference-inline" name="notification_preference" class="form-input account-inline-select" aria-label="Bildirim tercihi">
              <option value="all" ${notificationPreference === 'all' ? 'selected' : ''}>Tüm bildirimler</option>
              <option value="important" ${notificationPreference === 'important' ? 'selected' : ''}>Sadece önemli bildirimler</option>
              <option value="none" ${notificationPreference === 'none' ? 'selected' : ''}>Kapalı</option>
            </select>`
        })}
      </div>
      <p class="ud-empty-note" id="account-notifications-empty">Yeni bildirim yok. Analiz tamamlandığında veya favori güncellendiğinde burada listelenir.</p>
      <ul class="ud-notification-list" id="account-notifications-list" hidden></ul>
    </section>

    <section class="ud-panel ud-tab-panel account-hub-panel" id="${panelId('settings')}" data-dashboard-panel="settings" hidden role="tabpanel">
      <header class="account-panel-head">
        <h2>Profil Ayarları</h2>
        <p>Ad, iletişim ve tercih bilgilerinizi güncelleyin. Kaydet butonuna bastığınızda değişiklikler hesabınıza yansır.</p>
      </header>
      <form id="account-settings-form" class="account-settings-form" data-enterprise-form>
        <div class="account-form-section">
          <h3 class="account-form-section-title">Kişisel bilgiler</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="account-full-name">Ad Soyad</label>
              <input id="account-full-name" name="full_name" type="text" autocomplete="name" value="${escapeHtml(profile?.full_name || '')}" required placeholder="Adınız ve soyadınız">
            </div>
            <div class="form-group">
              <label for="account-phone">Telefon</label>
              <input id="account-phone" name="phone" type="tel" autocomplete="tel" value="${escapeHtml(profile?.phone || '')}" placeholder="+90 5XX XXX XX XX">
            </div>
          </div>
          <div class="form-group">
            <label for="account-location">Konum</label>
            <input id="account-location" name="location" type="text" value="${escapeHtml(profile?.location || '')}" placeholder="İl / İlçe">
          </div>
        </div>
        <div class="account-form-section">
          <h3 class="account-form-section-title">Tercihler</h3>
          <div class="form-group">
            <label for="account-notification-preference">Bildirim tercihi</label>
            <select id="account-notification-preference" name="notification_preference" class="form-input">
              <option value="all" ${notificationPreference === 'all' ? 'selected' : ''}>Tüm bildirimler</option>
              <option value="important" ${notificationPreference === 'important' ? 'selected' : ''}>Sadece önemli bildirimler</option>
              <option value="none" ${notificationPreference === 'none' ? 'selected' : ''}>Kapalı</option>
            </select>
          </div>
          <div class="form-group">
            <label for="account-bio">Kısa not <span class="account-field-hint">(isteğe bağlı)</span></label>
            <textarea id="account-bio" name="bio" rows="3" maxlength="280" placeholder="Karar tercihleriniz veya notlarınız">${escapeHtml(profile?.bio || '')}</textarea>
          </div>
        </div>
        <div class="account-form-footer">
          <button type="submit" class="btn btn-primary">Değişiklikleri kaydet</button>
          <button type="button" class="btn btn-ghost" id="account-logout-btn">Çıkış yap</button>
          <p id="account-settings-status" class="account-form-status" aria-live="polite"></p>
        </div>
      </form>
    </section>

    <section class="ud-panel ud-tab-panel account-hub-panel" id="${panelId('security')}" data-dashboard-panel="security" hidden role="tabpanel">
      <header class="account-panel-head">
        <h2>Hesap Güvenliği</h2>
        <p>Şifre, e-posta doğrulama ve KVKK haklarınızı bu bölümden yönetin.</p>
      </header>
      <div class="account-action-grid">
        ${renderActionCard({
          icon: 'key-round',
          title: 'Şifre',
          description: 'Şifrenizi unuttuysanız e-posta adresinize güvenli sıfırlama bağlantısı gönderilir.',
          actionHtml: '<button type="button" class="btn btn-outline btn-sm" id="account-reset-password">Şifre sıfırla</button>'
        })}
        ${renderActionCard({
          icon: 'mail-check',
          title: 'E-posta doğrulaması',
          description: emailVerified
            ? 'E-posta adresiniz doğrulandı. Hesabınız tam erişimle kullanılabilir.'
            : 'Hesabınızı tam olarak etkinleştirmek için e-posta doğrulaması gereklidir.',
          tone: emailVerified ? 'success' : 'warning',
          actionHtml: emailVerified
            ? '<span class="account-plan-badge tone-success">Doğrulandı</span>'
            : '<button type="button" class="btn btn-outline btn-sm" id="account-resend-verify">Doğrulama e-postası gönder</button>'
        })}
        ${renderActionCard({
          icon: 'file-shield',
          title: 'Kişisel verileriniz',
          description: 'KVKK kapsamındaki aydınlatma metinlerine buradan ulaşabilirsiniz.',
          actionHtml: `
            <div class="account-link-group">
              <a href="/kvkk.html">KVKK</a>
              <a href="/gizlilik.html">Gizlilik</a>
              <a href="/cerez-politikasi.html">Çerez</a>
            </div>`
        })}
        ${renderActionCard({
          icon: 'trash-2',
          title: 'Hesap silme (KVKK)',
          description: 'Hesabınız ve ilişkili veriler kalıcı olarak silinir. İşlem geri alınamaz.',
          tone: 'danger',
          actionHtml: '<button type="button" class="btn btn-outline btn-sm btn-danger-outline" id="account-delete-self-serve">Hesabımı sil</button>'
        })}
        ${renderActionCard({
          icon: 'mail',
          title: 'E-posta ile başvuru',
          description: 'Alternatif olarak KVKK kapsamında yazılı başvuru e-postası gönderebilirsiniz.',
          actionHtml: '<a href="mailto:info@istebul.com?subject=KVKK%20Hesap%20Silme%20Talebi" class="btn btn-outline btn-sm">E-posta ile talep</a>'
        })}
      </div>
      <p id="account-delete-status" class="account-form-status" aria-live="polite"></p>
    </section>

    <section class="ud-panel ud-tab-panel account-hub-panel" id="${panelId('help')}" data-dashboard-panel="help" hidden role="tabpanel">
      <header class="account-panel-head">
        <h2>Yardım & Destek</h2>
        <p>Sık sorulan sorular, destek kanalları ve platform rehberleri.</p>
      </header>
      <div class="account-help-grid">
        ${renderHelpCard({ icon: 'help-circle', title: 'Sık sorulan sorular', description: 'Abonelik, analiz ve hesap soruları', href: '/#landing-faq' })}
        ${renderHelpCard({ icon: 'message-square', title: 'Destek talebi', description: 'Ekibimize doğrudan ulaşın', href: '/iletisim.html' })}
        ${renderHelpCard({ icon: 'book-open', title: 'Metodoloji', description: 'Skorlama ve karar mantığı', href: '/metodoloji/' })}
        ${renderHelpCard({ icon: 'credit-card', title: 'Planlar', description: 'Ücretsiz ve Pro plan karşılaştırması', href: '/planlar' })}
        ${renderHelpCard({ icon: 'life-buoy', title: 'Yardım merkezi', description: 'Detaylı rehberler ve SSS araması', href: '/yardim.html' })}
      </div>
    </section>
  `;
}
