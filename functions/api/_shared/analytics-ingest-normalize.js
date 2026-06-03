/**
 * Normalize browser payloads to Supabase analytics-ingest batch contract.
 */

function randomSessionId() {
  return `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @param {unknown} body
 * @returns {{ session: Record<string, unknown> | null, events: Record<string, unknown>[] }}
 */
export function normalizeAnalyticsIngestBody(body) {
  if (!body || typeof body !== 'object') {
    return { session: null, events: [] };
  }

  const raw = /** @type {Record<string, unknown>} */ (body);

  if (Array.isArray(raw.events)) {
    const session =
      raw.session && typeof raw.session === 'object'
        ? /** @type {Record<string, unknown>} */ (raw.session)
        : null;
    return { session, events: raw.events.filter((e) => e && typeof e === 'object') };
  }

  if (raw.event_name) {
    const sessionId = String(raw.session_id || randomSessionId());
    const consent =
      raw.consent === true ||
      raw.consent_analytics === true ||
      (raw.session &&
        typeof raw.session === 'object' &&
        /** @type {Record<string, unknown>} */ (raw.session).consent_analytics === true);

    const pagePath = raw.page_path ? String(raw.page_path) : '/';
    const properties =
      raw.properties && typeof raw.properties === 'object'
        ? /** @type {Record<string, unknown>} */ (raw.properties)
        : {};

    return {
      session: {
        session_id: sessionId,
        page_path: pagePath,
        referrer: raw.referrer != null ? String(raw.referrer) : null,
        consent_analytics: consent
      },
      events: [
        {
          event_name: String(raw.event_name),
          session_id: sessionId,
          page_path: pagePath,
          event_category: raw.event_category ? String(raw.event_category) : undefined,
          properties: {
            ...properties,
            referrer: raw.referrer != null ? raw.referrer : null
          }
        }
      ]
    };
  }

  if (Array.isArray(body)) {
    return { session: null, events: body.filter((e) => e && typeof e === 'object') };
  }

  return { session: null, events: [raw] };
}
