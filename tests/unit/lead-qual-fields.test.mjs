import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichLeadQualFields } from '../../js/admin/lead-qual-fields.js';

test('enrichLeadQualFields parses qual from notes when columns empty', () => {
  const lead = enrichLeadQualFields({
    notes: 'Satın alma: 1-3 | Finansman niyeti: yes | Takas: no | Aciliyet: high | İletişim: whatsapp'
  });
  assert.equal(lead.purchase_timeline, '1-3');
  assert.equal(lead.financing_intent, 'yes');
  assert.equal(lead.trade_in, 'no');
  assert.equal(lead.urgency, 'high');
  assert.equal(lead.contact_preference, 'whatsapp');
});

test('enrichLeadQualFields prefers DB columns over notes', () => {
  const lead = enrichLeadQualFields({
    purchase_timeline: '6+',
    notes: 'Satın alma: 1-3'
  });
  assert.equal(lead.purchase_timeline, '6+');
});
