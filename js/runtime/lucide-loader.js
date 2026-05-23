const LUCIDE_SRC = 'https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js';
let lucidePromise = null;

function loadLucideScript() {
  if (window.lucide?.createIcons) {
    return Promise.resolve(window.lucide);
  }

  if (lucidePromise) {
    return lucidePromise;
  }

  lucidePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-lucide-loader]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.lucide));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = LUCIDE_SRC;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.dataset.lucideLoader = 'true';
    script.onload = () => resolve(window.lucide);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return lucidePromise;
}

export async function refreshLucideIcons() {
  try {
    const lucide = await loadLucideScript();
    lucide?.createIcons?.();
  } catch {
    // Icons are decorative; never block rendering.
  }
}

export function scheduleLucideIcons() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      refreshLucideIcons();
    }, { timeout: 2000 });
    return;
  }

  setTimeout(() => {
    refreshLucideIcons();
  }, 1);
}
