/**
 * Post-auth redirect for ?return= paths (e.g. /giris?return=/auto/).
 */

const STORAGE_KEY = 'istebul_auth_return_path';

const BLOCKED_PREFIXES = ['/giris', '/kayit', '/index.html'];

/**
 * @param {string} raw
 * @returns {string|null}
 */
export function sanitizeAuthReturnPath(raw) {
  if (!raw || typeof raw !== 'string') return null;

  let path = raw.trim();
  if (!path.startsWith('/')) return null;
  if (path.startsWith('//')) return null;
  if (/^https?:/i.test(path)) return null;

  try {
    const url = new URL(path, 'https://istebul.com');
    path = url.pathname + url.search + url.hash;
  } catch {
    return null;
  }

  const pathname = path.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  const lower = pathname.toLowerCase();

  if (BLOCKED_PREFIXES.some((prefix) => lower === prefix || lower.startsWith(`${prefix}/`))) {
    return null;
  }

  return path;
}

/**
 * Read ?return= from current location.
 * @returns {string|null}
 */
export function readAuthReturnFromLocation(search = typeof window !== 'undefined' ? window.location.search : '') {
  try {
    const params = new URLSearchParams(search);
    return sanitizeAuthReturnPath(params.get('return') || params.get('redirect') || '');
  } catch {
    return null;
  }
}

export function storePendingAuthReturn(path) {
  const safe = sanitizeAuthReturnPath(path);
  if (!safe) return false;
  try {
    sessionStorage.setItem(STORAGE_KEY, safe);
    return true;
  } catch {
    return false;
  }
}

export function peekPendingAuthReturn() {
  try {
    return sanitizeAuthReturnPath(sessionStorage.getItem(STORAGE_KEY) || '');
  } catch {
    return null;
  }
}

export function clearPendingAuthReturn() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Capture return URL from query and/or persist for OAuth round-trips.
 */
export function captureAuthReturnFromUrl(search = typeof window !== 'undefined' ? window.location.search : '') {
  const fromQuery = readAuthReturnFromLocation(search);
  if (fromQuery) {
    storePendingAuthReturn(fromQuery);
    return fromQuery;
  }
  return peekPendingAuthReturn();
}

/**
 * Navigate after successful login/register when a return path was stored.
 * @param {{ router?: { navigate: (path: string) => void } }} [options]
 * @returns {boolean} whether a redirect was performed
 */
export function completeAuthReturn(options = {}) {
  const target = peekPendingAuthReturn();
  if (!target) return false;

  clearPendingAuthReturn();

  if (target.startsWith('/auto')) {
    window.location.assign(target.endsWith('/') ? target : `${target}/`);
    return true;
  }

  const router = options.router;
  if (router?.navigate) {
    router.navigate(target);
    return true;
  }

  window.location.assign(target);
  return true;
}

/**
 * Open auth modal when landing on /giris or /kayit with optional return param.
 */
export function handleAuthRouteEntry(routeId, auth, search = typeof window !== 'undefined' ? window.location.search : '') {
  if (!auth) return;
  captureAuthReturnFromUrl(search);

  if (routeId === 'auth-login') {
    auth.showLoginModal();
    return;
  }
  if (routeId === 'auth-register') {
    auth.showRegisterModal();
  }
}
