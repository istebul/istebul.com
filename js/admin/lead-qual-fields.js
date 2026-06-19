/**
 * Backward-compatible lead qualification display when DB columns are null
 * but qual data was merged into notes by auto-intake.
 */

const NOTE_PATTERNS = {
  purchase_timeline: /Satın alma:\s*([^|]+)/,
  financing_intent: /Finansman niyeti:\s*([^|]+)/,
  trade_in: /Takas:\s*([^|]+)/,
  urgency: /Aciliyet:\s*([^|]+)/,
  contact_preference: /İletişim:\s*([^|]+)/
};

function fromNotes(notes, pattern) {
  const m = String(notes || '').match(pattern);
  return m ? m[1].trim() : '';
}

/**
 * @param {Record<string, unknown>} lead
 * @returns {Record<string, unknown>}
 */
export function enrichLeadQualFields(lead) {
  if (!lead || typeof lead !== 'object') return lead;
  const notes = lead.notes;
  const out = { ...lead };
  for (const [key, pattern] of Object.entries(NOTE_PATTERNS)) {
    if (!out[key]) {
      const parsed = fromNotes(notes, pattern);
      if (parsed) out[key] = parsed;
    }
  }
  return out;
}
