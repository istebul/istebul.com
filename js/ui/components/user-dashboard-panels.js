import { escapeHtml } from '../../core/security.js';

/**
 * @param {{ comparisons?: object[], recommendations?: object[], emailVerified?: boolean, profile?: object, notificationPreference?: string }} ctx
 */
export function renderUserDashboardTabPanels(ctx = {}) {
  const {
    comparisons = [],
    recommendations = [],
    emailVerified = true,
    profile = {},
    notificationPreference = 'all'
  } = ctx;

  return `
    <section class="ud-panel ud-tab-panel" data-dashboard-panel="comparisons" hidden>
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
        <a href="/auto/" class="btn btn-outline">Yeni analiz başlat</a>
      </div>
    </section>

    <section class="ud-panel ud-tab-panel" data-dashboard-panel="recommendations" hidden>
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

    <section class="ud-panel ud-tab-panel" data-dashboard-panel="notifications" hidden>
      <header class="account-panel-head">
        <h2>Bildirimler</h2>
        <p>Karar durum güncellemeleri ve hesap bildirimleri.</p>
      </header>
      <p class="ud-empty-note" id="account-notifications-empty">Yeni bildirim yok. Analiz tamamlandığında veya favori güncellendiğinde burada listelenir.</p>
      <ul class="ud-notification-list" id="account-notifications-list" hidden></ul>
      <div class="form-group" style="margin-top:1rem">
        <label for="account-notification-preference-inline">Bildirim tercihi</label>
        <select id="account-notification-preference-inline" name="notification_preference" class="form-input">
          <option value="all" ${notificationPreference === 'all' ? 'selected' : ''}>Tüm bildirimler</option>
          <option value="important" ${notificationPreference === 'important' ? 'selected' : ''}>Sadece önemli bildirimler</option>
          <option value="none" ${notificationPreference === 'none' ? 'selected' : ''}>Kapalı</option>
        </select>
      </div>
    </section>

    <section class="ud-panel ud-tab-panel" data-dashboard-panel="settings" hidden>
      <header class="account-panel-head">
        <h2>Profil Ayarları</h2>
        <p>Profil bilgileriniz ve iletişim tercihleriniz.</p>
      </header>
      <form id="account-settings-form" class="account-settings-form" data-enterprise-form>
        <div class="form-row">
          <div class="form-group">
            <label for="account-full-name">Ad Soyad</label>
            <input id="account-full-name" name="full_name" type="text" autocomplete="name" value="${escapeHtml(profile?.full_name || '')}" required>
          </div>
          <div class="form-group">
            <label for="account-phone">Telefon</label>
            <input id="account-phone" name="phone" type="tel" autocomplete="tel" value="${escapeHtml(profile?.phone || '')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="account-location">Konum</label>
            <input id="account-location" name="location" type="text" value="${escapeHtml(profile?.location || '')}" placeholder="İl / İlçe">
          </div>
          <div class="form-group">
            <label for="account-notification-preference">Bildirim tercihi</label>
            <select id="account-notification-preference" name="notification_preference" class="form-input">
              <option value="all" ${notificationPreference === 'all' ? 'selected' : ''}>Tüm bildirimler</option>
              <option value="important" ${notificationPreference === 'important' ? 'selected' : ''}>Sadece önemli bildirimler</option>
              <option value="none" ${notificationPreference === 'none' ? 'selected' : ''}>Kapalı</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="account-bio">Kısa not</label>
          <textarea id="account-bio" name="bio" rows="3" maxlength="280" placeholder="İsteğe bağlı">${escapeHtml(profile?.bio || '')}</textarea>
        </div>
        <div class="account-quick-actions">
          <button type="submit" class="btn btn-primary">Değişiklikleri kaydet</button>
          <button type="button" class="btn btn-ghost" id="account-logout-btn">Çıkış yap</button>
        </div>
      </form>
    </section>

    <section class="ud-panel ud-tab-panel" data-dashboard-panel="security" hidden>
      <header class="account-panel-head">
        <h2>Hesap Güvenliği</h2>
        <p>Şifre ve oturum güvenliği kontrolleri.</p>
      </header>
      <ul class="account-security-list">
        <li>
          <div>
            <strong>Şifre</strong>
            <p>Şifrenizi unuttuysanız güvenli sıfırlama bağlantısı alın.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="account-reset-password">Şifre sıfırla</button>
        </li>
        <li>
          <div>
            <strong>E-posta doğrulaması</strong>
            <p>${emailVerified ? 'E-posta doğrulandı.' : 'E-posta doğrulaması bekleniyor.'}</p>
          </div>
          ${
            emailVerified
              ? '<span class="account-plan-badge tone-success">Doğrulandı</span>'
              : '<button type="button" class="btn btn-outline btn-sm" id="account-resend-verify">Doğrulama e-postasını gönder</button>'
          }
        </li>
      </ul>
    </section>

    <section class="ud-panel ud-tab-panel" data-dashboard-panel="help" hidden>
      <header class="account-panel-head">
        <h2>Yardım & Destek</h2>
        <p>Sık sorulan sorular ve destek kanalları.</p>
      </header>
      <div class="account-quick-actions">
        <a href="/#landing-faq" class="btn btn-outline" data-home-anchor="landing-faq">SSS</a>
        <a href="/iletisim.html" class="btn btn-outline">Destek Talebi</a>
        <a href="/metodoloji/" class="btn btn-outline">Metodoloji</a>
        <a href="/planlar" class="btn btn-outline">Planlar</a>
      </div>
    </section>
  `;
}
