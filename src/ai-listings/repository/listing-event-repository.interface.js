/**
 * isteBul AI Listings Engine v1 — Listing event repository port.
 */

/**
 * @typedef {Object} AiListingEvent
 * @property {string} id
 * @property {string} listing_id
 * @property {string} event_type
 * @property {Record<string, unknown>} payload
 * @property {string} created_at
 */

/**
 * @typedef {Object} AiListingEventCreateInput
 * @property {string} listing_id
 * @property {string} event_type
 * @property {Record<string, unknown>} [payload]
 */

/**
 * @typedef {Object} AiListingEventRepository
 * @property {(input: AiListingEventCreateInput) => Promise<AiListingEvent>} create
 * @property {(listingId: string) => Promise<AiListingEvent[]>} listByListingId
 * @property {(eventType: string) => Promise<AiListingEvent[]>} listByType
 */
