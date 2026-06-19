import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { interpolateOutboundTemplate } from '../../js/features/sales/partner-sales-assets.js';

describe('P6.1 closing machine', () => {
  it('closing-machine.json is p6.x', () => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data/sales/closing-machine.json'),
      'utf8'
    );
    assert.ok(String(JSON.parse(raw).version).startsWith('p6.'));
  });

  it('sales deck has cover and close slides', () => {
    const deck = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/sales/partner-sales-deck.json'), 'utf8')
    );
    const ids = new Set((deck.slides || []).map((s) => s.id));
    assert.ok(ids.has('cover'));
    assert.ok(ids.has('close'));
  });

  it('pricing sheet has four tiers', () => {
    const sheet = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/sales/pricing-sheet.json'), 'utf8')
    );
    assert.equal((sheet.tiers || []).length, 4);
    assert.ok(sheet.talkTrack?.close);
  });

  it('email templates cover discover and close', () => {
    const emails = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/sales/email-templates.json'), 'utf8')
    );
    const ids = (emails.templates || []).map((t) => t.id);
    assert.ok(ids.includes('discover_intro'));
    assert.ok(ids.includes('close_contract'));
  });

  it('follow-up flow matches demo stage', () => {
    const flows = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/sales/follow-up-flows.json'), 'utf8')
    );
    const flow = (flows.flows || []).find((f) => f.trigger?.applicationStatus === 'demo');
    assert.equal(flow?.id, 'ae_pilot_close');
  });

  it('onboarding docs include kickoff', () => {
    const pack = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/sales/onboarding-docs.json'), 'utf8')
    );
    assert.ok((pack.docs || []).some((d) => d.id === 'kickoff'));
  });

  it('negotiate email template interpolates objection vars', () => {
    const emails = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/sales/email-templates.json'), 'utf8')
    );
    const t = emails.templates.find((x) => x.id === 'negotiate_objection');
    const body = interpolateOutboundTemplate(t.body, {
      objection_summary: 'Fiyat yüksek',
      objection_response: 'Pilot ile ölçün',
      close_line: 'Teklif bu hafta'
    });
    assert.match(body, /Fiyat yüksek/);
  });
});
