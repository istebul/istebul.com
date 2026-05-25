/**
 * Global toast for public / corporate pages (admin-panel has its own #toast).
 */

let rootEl = null;

function ensureRoot() {
  if (rootEl?.isConnected) return rootEl;
  rootEl = document.getElementById('ib-global-toast-root');
  if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.id = 'ib-global-toast-root';
    rootEl.className = 'ib-toast-root';
    rootEl.setAttribute('aria-live', 'polite');
    rootEl.setAttribute('aria-atomic', 'true');
    document.body.appendChild(rootEl);
  }
  return rootEl;
}

/**
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} [type]
 * @param {number} [durationMs]
 */
export function showToast(message, type = 'info', durationMs = 4200) {
  const root = ensureRoot();
  const el = document.createElement('div');
  el.className = `ib-toast ib-toast--${type} ib-toast--show`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.textContent = String(message || '');
  root.appendChild(el);

  const hide = () => {
    el.classList.remove('ib-toast--show');
    setTimeout(() => el.remove(), 280);
  };

  const timer = window.setTimeout(hide, durationMs);
  el.addEventListener('click', () => {
    window.clearTimeout(timer);
    hide();
  });
}

export function initGlobalToastStyles() {
  if (document.getElementById('ib-toast-styles')) return;
  const style = document.createElement('style');
  style.id = 'ib-toast-styles';
  style.textContent = `
    .ib-toast-root {
      position: fixed;
      right: max(12px, env(safe-area-inset-right));
      bottom: max(12px, env(safe-area-inset-bottom));
      z-index: var(--z-toast, 9999);
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: min(360px, calc(100vw - 24px));
      pointer-events: none;
    }
    .ib-toast {
      pointer-events: auto;
      padding: 12px 14px;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 600;
      line-height: 1.4;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.22s ease, transform 0.22s ease;
      background: #0f172a;
      color: #f8fafc;
    }
    .ib-toast--show { opacity: 1; transform: translateY(0); }
    .ib-toast--success { background: #065f46; }
    .ib-toast--error { background: #991b1b; }
    .ib-toast--warning { background: #92400e; }
    .ib-toast--info { background: #1e3a5f; }
  `;
  document.head.appendChild(style);
}
