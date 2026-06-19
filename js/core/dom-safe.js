import { escapeHtml } from './security.js';

export { escapeHtml };

export function safeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

export function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
