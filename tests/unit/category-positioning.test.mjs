import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CATEGORY_DEFINITION,
  CATEGORY_TAGLINES,
  CATEGORY_NOT,
  COMPETITOR_ALTERNATIVES,
  renderCategoryNotStripHtml,
  renderCompetitorAlternativesHtml
} from '../../js/features/moat/category-positioning.js';

test('CATEGORY_DEFINITION positions decision infrastructure', () => {
  assert.match(CATEGORY_DEFINITION.oneLiner, /ilan sitesi/i);
  assert.match(CATEGORY_DEFINITION.oneLiner, /sohbet botu/i);
});

test('CATEGORY_TAGLINES include hero and AI contrast', () => {
  assert.match(CATEGORY_TAGLINES.hero, /İlan bulmak başka/);
  assert.match(CATEGORY_TAGLINES.aiContrast, /Generic AI/);
  assert.match(CATEGORY_TAGLINES.tco, /Toplam sahip olma/);
});

test('COMPETITOR_ALTERNATIVES reference classifieds without bashing', () => {
  const classifieds = COMPETITOR_ALTERNATIVES.find((r) => r.id === 'classifieds');
  assert.ok(classifieds.examples.includes('Sahibinden'));
  assert.ok(classifieds.focus.length > 0);
  assert.ok(classifieds.istebul.length > 0);
});

test('render helpers output structure', () => {
  assert.equal(CATEGORY_NOT.length, 3);
  assert.match(renderCategoryNotStripHtml(), /İlan sitesi değil/);
  assert.match(renderCompetitorAlternativesHtml(), /ib-category-alt-card/);
});
