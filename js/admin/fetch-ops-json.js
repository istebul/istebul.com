/**
 * Load ops JSON for admin panels — fetch with build-time embed fallback when CDN/SPA returns HTML.
 */
import { OPS_JSON_EMBED } from './ops-json-embed.js';

/**
 * @param {string} urlPath e.g. /data/ops/strategic-partnership-roadmap.json
 * @param {string} embedKey key in OPS_JSON_EMBED (filename without .json)
 * @param {object} [fallback] used when embed missing
 */
export async function fetchOpsJson(urlPath, embedKey, fallback = null) {
  const embedded = OPS_JSON_EMBED[embedKey] ?? fallback;

  try {
    const res = await fetch(urlPath, { credentials: 'same-origin', cache: 'no-cache' });
    const text = await res.text();
    const trimmed = text.trimStart();
    if (!res.ok || trimmed.startsWith('<') || trimmed.startsWith('<!')) {
      if (embedded) return structuredClone(embedded);
      throw new Error(`HTTP ${res.status} or non-JSON body for ${urlPath}`);
    }
    return JSON.parse(text);
  } catch (err) {
    if (embedded) return structuredClone(embedded);
    throw err;
  }
}
