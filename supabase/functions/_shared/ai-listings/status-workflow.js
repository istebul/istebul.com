/**
 * isteBul AI Listings — QA status workflow (Sprint-7).
 *
 * approved means internally approved only; public publishing remains disabled.
 */

export const LISTING_STATUSES = Object.freeze([
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'archived'
]);

/** @type {Readonly<Record<string, string>>} */
export const QA_EVENT_TYPES = Object.freeze({
  SUBMIT_REVIEW: 'listing_submitted_for_review',
  APPROVED: 'listing_approved',
  REJECTED: 'listing_rejected',
  ARCHIVED: 'listing_archived',
  REANALYZED: 'listing_reanalyzed'
});

/** @type {Readonly<Record<string, string>>} */
export const QA_ACTIONS = Object.freeze({
  SUBMIT_REVIEW: 'submit-review',
  APPROVE: 'approve',
  REJECT: 'reject',
  ARCHIVE: 'archive',
  REANALYZE: 'reanalyze'
});

export const STATUS_FILTER_CHIPS = Object.freeze([
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' }
]);

/**
 * Public marketplace visibility gate — always false in Sprint-7.
 * approved means internally approved only; public publishing remains disabled.
 * @param {string} [_status]
 * @returns {boolean}
 */
export function isListingPubliclyVisible(_status) {
  return false;
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
export function isValidListingStatus(status) {
  return LISTING_STATUSES.includes(String(status ?? '').trim());
}

/**
 * @param {string} current
 * @param {string} action
 * @returns {{ ok: true, nextStatus: string } | { ok: false, message: string }}
 */
export function resolveStatusTransition(current, action) {
  const status = String(current ?? '').trim() || 'draft';

  if (action === QA_ACTIONS.SUBMIT_REVIEW) {
    if (status === 'draft' || status === 'rejected') {
      return { ok: true, nextStatus: 'pending_review' };
    }
    return { ok: false, message: 'Only draft or rejected listings can be submitted for review.' };
  }

  if (action === QA_ACTIONS.APPROVE) {
    if (status === 'pending_review') return { ok: true, nextStatus: 'approved' };
    return { ok: false, message: 'Only pending_review listings can be approved.' };
  }

  if (action === QA_ACTIONS.REJECT) {
    if (status === 'pending_review') return { ok: true, nextStatus: 'rejected' };
    return { ok: false, message: 'Only pending_review listings can be rejected.' };
  }

  if (action === QA_ACTIONS.ARCHIVE) {
    if (status === 'archived') return { ok: false, message: 'Listing is already archived.' };
    return { ok: true, nextStatus: 'archived' };
  }

  if (action === QA_ACTIONS.REANALYZE) {
    if (status === 'archived') return { ok: false, message: 'Archived listings cannot be re-analyzed.' };
    return { ok: true, nextStatus: status };
  }

  return { ok: false, message: `Unknown workflow action: ${action}` };
}

/**
 * @param {string} action
 * @returns {string}
 */
export function eventTypeForAction(action) {
  switch (action) {
    case QA_ACTIONS.SUBMIT_REVIEW:
      return QA_EVENT_TYPES.SUBMIT_REVIEW;
    case QA_ACTIONS.APPROVE:
      return QA_EVENT_TYPES.APPROVED;
    case QA_ACTIONS.REJECT:
      return QA_EVENT_TYPES.REJECTED;
    case QA_ACTIONS.ARCHIVE:
      return QA_EVENT_TYPES.ARCHIVED;
    case QA_ACTIONS.REANALYZE:
      return QA_EVENT_TYPES.REANALYZED;
    default:
      return 'listing_workflow_action';
  }
}

/**
 * @param {unknown} chipValue
 * @returns {string}
 */
export function normalizeStatusFilter(chipValue) {
  const value = String(chipValue ?? '').trim();
  if (!value) return '';
  return isValidListingStatus(value) ? value : '';
}
