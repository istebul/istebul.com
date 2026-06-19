/**
 * Client-side internal traffic signals (privacy-friendly hashes only).
 */
export const INTERNAL_DEVICE_TOKEN_KEY = 'ib_internal_device_token';
export const INTERNAL_TEST_FLAG_KEY = 'istebul_internal_test';

export async function sha256HexClient(input) {
  const text = String(input ?? '');
  if (!globalThis.crypto?.subtle) {
    return `weak_${text.length}_${text.slice(0, 8)}`;
  }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getDeviceFingerprintPayload() {
  return {
    ua: String(navigator.userAgent || '').slice(0, 200),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    lang: navigator.language || '',
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    platform: navigator.platform || ''
  };
}

export function ensureInternalDeviceToken() {
  let token = localStorage.getItem(INTERNAL_DEVICE_TOKEN_KEY);
  if (!token) {
    token =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `ibd_${crypto.randomUUID()}`
        : `ibd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    try {
      localStorage.setItem(INTERNAL_DEVICE_TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  }
  return token;
}

export function markCurrentDeviceAsInternalTest() {
  ensureInternalDeviceToken();
  try {
    localStorage.setItem(INTERNAL_TEST_FLAG_KEY, 'true');
  } catch {
    /* ignore */
  }
  return ensureInternalDeviceToken();
}

export async function getDeviceHash() {
  const token = localStorage.getItem(INTERNAL_DEVICE_TOKEN_KEY) || '';
  const fp = getDeviceFingerprintPayload();
  return sha256HexClient(JSON.stringify({ ...fp, token }));
}

export async function getUserAgentHashClient() {
  return sha256HexClient(navigator.userAgent || 'unknown');
}

export function isInternalTestParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('internal_test') === '1';
  } catch {
    return false;
  }
}

export function isInternalLocalStorageFlag() {
  try {
    return localStorage.getItem(INTERNAL_TEST_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function isInternalPreviewHost() {
  const host = String(window.location.hostname || '').toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.pages.dev') ||
    host.includes('preview')
  );
}

export function isAdminPanelPath() {
  return String(window.location.pathname || '').includes('admin-panel');
}

export function detectClientInternalReason() {
  if (isAdminPanelPath()) return 'admin_user';
  if (isInternalTestParam()) return 'internal_param';
  if (isInternalLocalStorageFlag()) return 'internal_param';
  if (isInternalPreviewHost()) {
    return window.location.hostname.includes('pages.dev')
      ? 'preview_domain'
      : 'localhost';
  }
  return null;
}

export async function buildTrafficContext(extra = {}) {
  const clientReason = detectClientInternalReason();
  const device_hash = await getDeviceHash();
  const user_agent_hash = await getUserAgentHashClient();

  return {
    device_hash,
    user_agent_hash,
    page_host: window.location.hostname,
    internal_param: isInternalTestParam(),
    local_storage_flag: isInternalLocalStorageFlag(),
    admin_panel: isAdminPanelPath(),
    client_is_internal: Boolean(clientReason),
    client_internal_reason: clientReason,
    ...extra
  };
}
