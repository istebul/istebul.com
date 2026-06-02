/**
 * PWA shell — service worker, install prompt, iOS add-to-home hint, update banner.
 * Loaded from app.js (homepage) and vertical-locale-shell.js (decision verticals).
 */

const DISMISS_KEY = 'ib_pwa_install_dismissed_until';
const IOS_HINT_KEY = 'ib_pwa_ios_hint_shown';
const DISMISS_DAYS = 14;

function isStandalone() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.navigator.standalone === true) return true;
  return false;
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return isIos && isSafari;
}

function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}

function isAdminSurface() {
  const path = (typeof location !== 'undefined' && location.pathname) || '';
  return path.includes('admin-panel') || path.startsWith('/admin');
}

function readDismissUntil() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return 0;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : 0;
  } catch {
    return 0;
  }
}

function dismissInstallUi(days = DISMISS_DAYS) {
  try {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
  } catch {
    /* ignore */
  }
  hideInstallUi();
}

function installUiAllowed() {
  if (isStandalone() || isAdminSurface()) return false;
  return Date.now() > readDismissUntil();
}

function hideInstallUi() {
  document.getElementById('ib-pwa-install-banner')?.remove();
  document.getElementById('ib-pwa-ios-sheet')?.remove();
  document.getElementById('pwa-install-btn')?.remove();
}

function bindBannerActions(root, onInstall, { iosHint = false } = {}) {
  root.querySelector('[data-ib-pwa-install]')?.addEventListener('click', () => {
    onInstall?.();
  });
  root.querySelector('[data-ib-pwa-dismiss]')?.addEventListener('click', () => {
    dismissInstallUi();
  });
  if (iosHint) {
    root.querySelector('[data-ib-pwa-ios-close]')?.addEventListener('click', () => {
      try {
        localStorage.setItem(IOS_HINT_KEY, '1');
      } catch {
        /* ignore */
      }
      hideInstallUi();
    });
  }
}

function showInstallBanner(deferredPrompt) {
  if (!installUiAllowed()) return;
  hideInstallUi();

  const banner = document.createElement('div');
  banner.id = 'ib-pwa-install-banner';
  banner.className = 'ib-pwa-install-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Uygulamayı yükle');
  banner.innerHTML = `
    <div class="ib-pwa-install-banner__inner">
      <img class="ib-pwa-install-banner__icon" src="/assets/icons/favicon-192.png" width="40" height="40" alt="" decoding="async">
      <div class="ib-pwa-install-banner__copy">
        <strong>isteBul'u uygulama gibi kullanın</strong>
        <span>Hızlı erişim için ana ekrana ekleyin.</span>
      </div>
      <div class="ib-pwa-install-banner__actions">
        <button type="button" class="ib-pwa-install-banner__primary" data-ib-pwa-install>Yükle</button>
        <button type="button" class="ib-pwa-install-banner__ghost" data-ib-pwa-dismiss aria-label="Kapat">×</button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  bindBannerActions(banner, async () => {
    if (!deferredPrompt) return;
    banner.classList.add('is-busy');
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      /* user dismissed */
    }
    hideInstallUi();
    dismissInstallUi(30);
  });
}

function showIosInstallHint() {
  if (!installUiAllowed() || !isIosSafari()) return;
  try {
    if (localStorage.getItem(IOS_HINT_KEY) === '1') return;
  } catch {
    return;
  }
  hideInstallUi();

  const sheet = document.createElement('div');
  sheet.id = 'ib-pwa-ios-sheet';
  sheet.className = 'ib-pwa-ios-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', 'Ana ekrana ekle');
  sheet.innerHTML = `
    <div class="ib-pwa-ios-sheet__backdrop" data-ib-pwa-ios-close></div>
    <div class="ib-pwa-ios-sheet__panel">
      <button type="button" class="ib-pwa-ios-sheet__close" data-ib-pwa-ios-close aria-label="Kapat">×</button>
      <img src="/assets/icons/favicon-192.png" width="48" height="48" alt="" class="ib-pwa-ios-sheet__icon" decoding="async">
      <h2>Ana ekrana ekleyin</h2>
      <p>Safari'de <strong>Paylaş</strong> düğmesine dokunun, ardından <strong>Ana Ekrana Ekle</strong> seçin.</p>
      <button type="button" class="ib-pwa-ios-sheet__primary" data-ib-pwa-ios-close>Tamam</button>
    </div>
  `;

  document.body.appendChild(sheet);
  bindBannerActions(sheet, null, { iosHint: true });
}

function showUpdateNotification() {
  if (document.querySelector('.update-notification')) return;

  const updateDiv = document.createElement('div');
  updateDiv.className = 'update-notification ib-pwa-update-banner';
  updateDiv.innerHTML = `
    <div class="update-content">
      <div class="update-text">
        <strong>Yeni sürüm hazır</strong>
        <span>Güncellemek için yenileyin.</span>
      </div>
      <button type="button" data-action="reload-page" class="btn btn-primary btn-sm">Güncelle</button>
      <button type="button" data-ib-pwa-skip-waiting class="btn btn-secondary btn-sm">Arka planda</button>
      <button type="button" data-action="dismiss-parent-card" class="btn-close" aria-label="Kapat">×</button>
    </div>
  `;

  document.body.appendChild(updateDiv);

  updateDiv.querySelector('[data-ib-pwa-skip-waiting]')?.addEventListener('click', () => {
    navigator.serviceWorker?.controller?.postMessage?.({ type: 'SKIP_WAITING' });
    updateDiv.remove();
  });

  setTimeout(() => {
    updateDiv.remove();
  }, 45000);
}

function registerServiceWorker() {
  const enableServiceWorker = window.ISTEBU_ENABLE_SW === true;

  if (!enableServiceWorker) {
    setupInstallPrompt();
    maybeShowIosHintDelayed();
    return;
  }

  if (!('serviceWorker' in navigator)) {
    setupInstallPrompt();
    maybeShowIosHintDelayed();
    return;
  }

  navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateNotification();
          }
        });
      });

      setupInstallPrompt();
      maybeShowIosHintDelayed();
    })
    .catch(() => {
      setupInstallPrompt();
      maybeShowIosHintDelayed();
    });
}

function setupInstallPrompt() {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!installUiAllowed()) return;
    showInstallBanner(deferredPrompt);
  });

  window.addEventListener('appinstalled', () => {
    hideInstallUi();
    try {
      localStorage.setItem(IOS_HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  });
}

function maybeShowIosHintDelayed() {
  if (!isIosSafari() || !isMobileViewport()) return;
  const delayMs = 8000;
  window.setTimeout(() => {
    if (!installUiAllowed()) return;
    showIosInstallHint();
  }, delayMs);
}

/** @param {{ deferIosHint?: boolean }} [options] */
export function initPwaShell(options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__ibPwaShellInit) return;
  window.__ibPwaShellInit = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => registerServiceWorker(), { once: true });
  } else {
    registerServiceWorker();
  }

  if (options.deferIosHint === false) {
    maybeShowIosHintDelayed();
  }
}
