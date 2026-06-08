/**
 * Decision History — event capture and aggregation (Sprint-31).
 */

export const DECISION_HISTORY_EVENT_TYPES = Object.freeze([
  'listing_viewed',
  'recommendation_opened',
  'compare_opened',
  'report_opened',
  'scenario_opened',
  'decision_center_opened'
]);

export const DECISION_HISTORY_EVENT_LABELS = Object.freeze({
  listing_viewed: 'Seçenek görüntülendi',
  recommendation_opened: 'Öneri açıldı',
  compare_opened: 'Karşılaştırma açıldı',
  report_opened: 'Rapor açıldı',
  scenario_opened: 'Senaryo açıldı',
  decision_center_opened: 'Karar Merkezi açıldı'
});

/**
 * @param {string} eventType
 * @returns {boolean}
 */
export function isValidHistoryEventType(eventType) {
  return DECISION_HISTORY_EVENT_TYPES.includes(String(eventType));
}

/**
 * @param {Record<string, unknown>} event
 * @returns {Record<string, unknown>}
 */
export function normalizeHistoryEvent(event = {}) {
  const eventType = String(event.event_type ?? event.eventType ?? '');
  return {
    id: String(event.id ?? `evt_${Date.now()}`),
    user_id: String(event.user_id ?? event.userId ?? ''),
    listing_id: String(event.listing_id ?? event.listingId ?? ''),
    event_type: isValidHistoryEventType(eventType) ? eventType : 'listing_viewed',
    payload: typeof event.payload === 'object' && event.payload ? event.payload : {},
    created_at: String(event.created_at ?? event.createdAt ?? new Date().toISOString())
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {Record<string, unknown>}
 */
export function normalizeHistoryRecord(record = {}) {
  return {
    id: String(record.id ?? ''),
    user_id: String(record.user_id ?? record.userId ?? ''),
    listing_id: String(record.listing_id ?? record.listingId ?? ''),
    listing_title: String(record.listing_title ?? record.listingTitle ?? ''),
    listing_category: String(record.listing_category ?? record.listingCategory ?? ''),
    last_event_type: String(record.last_event_type ?? record.lastEventType ?? ''),
    event_count: Number(record.event_count ?? record.eventCount ?? 0),
    metadata: typeof record.metadata === 'object' && record.metadata ? record.metadata : {},
    created_at: String(record.created_at ?? record.createdAt ?? ''),
    updated_at: String(record.updated_at ?? record.updatedAt ?? '')
  };
}

/**
 * @param {Record<string, unknown>} params
 * @returns {Record<string, unknown>}
 */
export function createHistoryEvent(params = {}) {
  const eventType = String(params.eventType ?? params.event_type ?? 'listing_viewed');
  if (!isValidHistoryEventType(eventType)) {
    throw new Error(`Geçersiz olay türü: ${eventType}`);
  }

  return normalizeHistoryEvent({
    user_id: params.userId ?? params.user_id,
    listing_id: params.listingId ?? params.listing_id,
    event_type: eventType,
    payload: params.payload ?? {},
    created_at: new Date().toISOString()
  });
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @param {Record<string, unknown>} [existing]
 * @returns {Record<string, unknown>}
 */
export function aggregateHistoryRecord(events, existing = {}) {
  const normalized = events.map(normalizeHistoryEvent).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latest = normalized[0];

  if (!latest) {
    return normalizeHistoryRecord(existing);
  }

  return normalizeHistoryRecord({
    ...existing,
    user_id: latest.user_id,
    listing_id: latest.listing_id,
    last_event_type: latest.event_type,
    event_count: normalized.length + Number(existing.event_count ?? 0),
    updated_at: latest.created_at
  });
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @returns {Array<Record<string, unknown>>}
 */
export function buildHistoryTimeline(events = []) {
  return events
    .map(normalizeHistoryEvent)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((event) => ({
      ...event,
      label: DECISION_HISTORY_EVENT_LABELS[event.event_type] ?? event.event_type
    }));
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string} eventType
 * @param {number} [limit]
 * @returns {Array<Record<string, unknown>>}
 */
export function filterHistoryByEventType(records, eventType, limit = 10) {
  return records
    .filter((r) => String(r.last_event_type ?? r.lastEventType) === eventType)
    .slice(0, limit);
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {number} [limit]
 * @returns {Array<Record<string, unknown>>}
 */
export function getRecentlyViewedListings(records = [], limit = 8) {
  return filterHistoryByEventType(
    records.filter((r) => r.listing_id || r.listingId),
    'listing_viewed',
    limit
  ).map(normalizeHistoryRecord);
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {number} [limit]
 * @returns {Array<Record<string, unknown>>}
 */
export function getRecentComparisons(records = [], limit = 5) {
  return filterHistoryByEventType(records, 'compare_opened', limit).map(normalizeHistoryRecord);
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {number} [limit]
 * @returns {Array<Record<string, unknown>>}
 */
export function getRecentReports(records = [], limit = 5) {
  return filterHistoryByEventType(records, 'report_opened', limit).map(normalizeHistoryRecord);
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @param {Record<string, unknown>} record
 * @returns {{ events: Array<Record<string, unknown>>, record: Record<string, unknown> }}
 */
export function appendHistoryEvent(events, record, newEvent) {
  const normalized = createHistoryEvent(newEvent);
  const nextEvents = [normalized, ...events.map(normalizeHistoryEvent)];
  const listingEvents = nextEvents.filter((e) => e.listing_id === normalized.listing_id);
  const nextRecord = aggregateHistoryRecord(listingEvents, {
    ...record,
    listing_id: normalized.listing_id,
    listing_title: newEvent.listingTitle ?? record.listing_title,
    listing_category: newEvent.listingCategory ?? record.listing_category
  });
  return { events: nextEvents, record: nextRecord };
}
