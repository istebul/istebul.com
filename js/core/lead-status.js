/**
 * Shared auto-lead status normalization (legacy DB values → CRM pipeline ids).
 */

const LEGACY_STATUS_MAP = Object.freeze({
  called: 'first_contact',
  interested: 'proposal_sent',
  closed: 'won',
  rejected: 'lost'
});

export function normalizeLeadStatus(status) {
  const raw = String(status || 'new').trim();
  return LEGACY_STATUS_MAP[raw] || raw;
}

export function countLeadsByNormalizedStatus(leads = []) {
  return leads.reduce((acc, lead) => {
    const key = normalizeLeadStatus(lead.status);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}
