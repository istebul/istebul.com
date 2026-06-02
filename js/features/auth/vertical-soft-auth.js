/**
 * Soft auth banner for standalone vertical pages (no SPA auth modal).
 */
export function mountVerticalSoftAuthGate(options = {}) {
  const returnPath =
    options.returnPath ||
    `${window.location.pathname || '/'}${window.location.search || ''}`;
  const ret = encodeURIComponent(returnPath);
  const existing = document.getElementById('ib-vertical-soft-auth');
  if (existing) return existing;

  const banner = document.createElement('aside');
  banner.id = 'ib-vertical-soft-auth';
  banner.className = 'ib-vertical-soft-auth';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Hesap önerisi');
  banner.innerHTML = `
    <p>${options.message || 'Analiz sonucunu kaydetmek ve PDF indirmek için ücretsiz hesap oluşturabilirsiniz.'}</p>
    <div class="ib-vertical-soft-auth__actions">
      <a class="btn btn-primary btn-sm" href="/kayit?return=${ret}">Ücretsiz hesap</a>
      <a class="btn btn-outline btn-sm" href="/giris?return=${ret}">Giriş yap</a>
    </div>`;

  const host =
    document.querySelector('[data-vertical-soft-auth-host]') ||
    document.querySelector('.vacation-flow-main') ||
    document.querySelector('.vacation-main') ||
    null;
  if (!host) return null;
  host.prepend(banner);
  return banner;
}
