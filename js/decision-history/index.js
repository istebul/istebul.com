/**
 * Decision History — client entry (Sprint-31).
 */

export {
  DECISION_HISTORY_EVENT_TYPES,
  DECISION_HISTORY_EVENT_LABELS,
  isValidHistoryEventType,
  normalizeHistoryEvent,
  normalizeHistoryRecord,
  createHistoryEvent,
  aggregateHistoryRecord,
  buildHistoryTimeline,
  filterHistoryByEventType,
  getRecentlyViewedListings,
  getRecentComparisons,
  getRecentReports,
  appendHistoryEvent
} from './history-engine.js';

export { buildHistoryTimelineHtml } from './history-timeline-builder.js';
