/**
 * Reliable mount for standalone corporate/partner HTML pages (no SPA bundle).
 */
import { initCorporateUx } from './corporate-ux.js';

const CORPORATE_MOUNT_TIMEOUT_MS = 12_000;

let corporateMountWatchdogId = 0;

function clearCorporateMountWatchdog() {
  if (corporateMountWatchdogId) {
    clearTimeout(corporateMountWatchdogId);
    corporateMountWatchdogId = 0;
  }
}

function scheduleCorporateMountWatchdog(label, timeoutMs = CORPORATE_MOUNT_TIMEOUT_MS) {
  clearCorporateMountWatchdog();
  corporateMountWatchdogId = setTimeout(() => {
    if (document.documentElement.classList.contains('ib-corporate-mounted')) return;
    showCorporateMountError(label, { message: 'mount_timeout' });
  }, timeoutMs);
}

export function mountCorporatePage(mountFn, options = {}) {
  const label = options.label || 'Sayfa';
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : CORPORATE_MOUNT_TIMEOUT_MS;

  scheduleCorporateMountWatchdog(label, timeoutMs);

  const run = async () => {
    try {
      initCorporateUx();
      await mountFn();
      document.documentElement.classList.add('ib-corporate-mounted');
      clearCorporateMountWatchdog();
      document.querySelector('[data-corporate-loading]')?.remove();
    } catch (error) {
      clearCorporateMountWatchdog();
      console.error(`[corporate] ${label} mount failed`, error);
      showCorporateMountError(label, error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void run();
    });
  } else {
    void run();
  }
}

function showCorporateMountError(label, error) {
  const root =
    document.querySelector('[data-corporate-mount-root]') ||
    document.querySelector('main') ||
    document.body;

  const message =
    error?.message === 'no_config'
      ? 'Yapılandırma yüklenemedi. Lütfen sayfayı yenileyin veya <a href="/iletisim.html">iletişime</a> geçin.'
      : error?.message === 'mount_timeout'
        ? 'Sayfa beklenenden uzun sürdü. Bağlantınızı kontrol edin veya <a href="/iletisim.html">iletişime</a> geçin.'
        : 'İçerik yüklenirken bir sorun oluştu. Sayfayı yenileyin veya bağlantınızı kontrol edin.';

  const panel = document.createElement('div');
  panel.className = 'ib-corporate-mount-error';
  panel.setAttribute('role', 'alert');
  panel.innerHTML = `
    <p class="kicker">${label}</p>
    <h2>Geçici yükleme sorunu</h2>
    <p>${message}</p>
    <p class="text-muted-sm">Hata kodu: ${String(error?.message || 'mount_failed').slice(0, 120)}</p>
    <button type="button" class="btn primary" data-reload-page>Yeniden dene</button>
  `;
  panel.querySelector('[data-reload-page]')?.addEventListener('click', () => window.location.reload());

  const loading = root.querySelector('[data-corporate-loading]');
  if (loading) {
    loading.replaceWith(panel);
    return;
  }
  root.prepend(panel);
}
