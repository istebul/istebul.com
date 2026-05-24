import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MOAT_LAYERS,
  computeMoatLayerHealth,
  computeDefensibilityIndex,
  assessCompetitorCopyBundle,
  scoreMoatLayer
} from '../../js/features/moat/moat-architecture-shared.js';
import { renderMoatArchitectureProductSection } from '../../js/features/moat/moat-architecture-ui.js';

test('MOAT_LAYERS defines eight defensibility pillars', () => {
  assert.equal(MOAT_LAYERS.length, 8);
  const ids = MOAT_LAYERS.map((l) => l.id);
  assert.ok(ids.includes('proprietary_decision_logic'));
  assert.ok(ids.includes('b2b_network_effects'));
  assert.ok(ids.includes('referral_graph'));
});

test('scoreMoatLayer increases with operational volume', () => {
  const low = scoreMoatLayer('anonymized_outcome_feedback', { outcomeSignalTotal: 0 });
  const high = scoreMoatLayer('anonymized_outcome_feedback', { outcomeSignalTotal: 200 });
  assert.ok(high > low);
});

test('computeDefensibilityIndex is weighted average', () => {
  const layers = computeMoatLayerHealth({
    leadCount: 100,
    decisionLinkedCount: 80,
    outcomeSignalTotal: 50,
    outcomeCount: 20,
    activePartnerEndpoints: 5
  });
  const index = computeDefensibilityIndex(layers);
  assert.ok(index >= 0 && index <= 100);
});

test('assessCompetitorCopyBundle explains composite defense', () => {
  const layers = computeMoatLayerHealth({ leadCount: 50, decisionLinkedCount: 40, outcomeCount: 10 });
  const copy = assessCompetitorCopyBundle(layers);
  assert.ok(copy.headline.length > 10);
  assert.equal(copy.layers.length, 8);
});

test('renderMoatArchitectureProductSection includes copy resistance framing', () => {
  const html = renderMoatArchitectureProductSection({});
  assert.match(html, /rakip nasıl kopyalar/i);
  assert.match(html, /Defensibility index/i);
  assert.match(html, /proprietary_decision_logic|Deterministik karar motoru/i);
});
