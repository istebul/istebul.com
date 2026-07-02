import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.join(process.cwd(), 'css/admin-ai-listings.css');
const css = fs.readFileSync(cssPath, 'utf8');

function mobile640Block() {
  const blocks = css.match(/@media \(max-width: 640px\)\s*\{[\s\S]*?\n\}/g) || [];
  const match = blocks.find((block) => block.includes('.ai-neg-panel__hero'));
  assert.ok(match, 'expected @media (max-width: 640px) block with negotiation hero');
  return match;
}

test('host selectors include negotiation panel host', () => {
  assert.match(css, /\.ai-neg-panel-host\s*\{/);
  assert.match(css, /\.ai-neg-panel-host:not\(\[hidden\]\)/);
});

test('panel shell includes negotiation workspace drawer selectors', () => {
  assert.match(css, /\.ai-neg-panel\s*\{/);
  assert.match(css, /\.ai-neg-panel__backdrop/);
  assert.match(css, /\.ai-neg-panel__head/);
  assert.match(css, /\.ai-neg-panel__body/);
  assert.match(css, /\.ai-neg-panel__close/);
});

test('negotiation content class selectors are defined', () => {
  const contentClasses = [
    'ai-neg-panel__hero',
    'ai-neg-panel__metric',
    'ai-neg-panel__badge',
    'ai-neg-panel__section',
    'ai-neg-panel__checklist',
    'ai-neg-panel__warnings',
    'ai-neg-panel__evidence',
    'ai-neg-panel__empty'
  ];

  for (const className of contentClasses) {
    assert.match(css, new RegExp(`\\.${className}\\b`));
  }
});

test('negotiation risk badge modifiers are defined', () => {
  assert.match(css, /\.ai-neg-panel__badge--low/);
  assert.match(css, /\.ai-neg-panel__badge--medium/);
  assert.match(css, /\.ai-neg-panel__badge--high/);
});

test('negotiation checklist and evidence modifiers are defined', () => {
  assert.match(css, /\.ai-neg-panel__checklist-item--pending/);
  assert.match(css, /\.ai-neg-panel__checklist-item--ok/);
  assert.match(css, /\.ai-neg-panel__checklist-item--warn/);
  assert.match(css, /\.ai-neg-panel__evidence-item--positive/);
  assert.match(css, /\.ai-neg-panel__evidence-item--negative/);
  assert.match(css, /\.ai-neg-panel__evidence-item--neutral/);
});

test('negotiation drawer has responsive hero rule', () => {
  const mobileBlock = mobile640Block();
  assert.match(mobileBlock, /\.ai-neg-panel__hero\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
});

test('existing workspace drawer panel selectors remain in CSS', () => {
  const legacyPanels = [
    'ai-pd-panel',
    'ai-ss-panel',
    'ai-cmp-panel',
    'ai-exp-panel',
    'ai-edr-panel'
  ];

  for (const className of legacyPanels) {
    assert.match(css, new RegExp(`\\.${className}\\b`));
  }
});

test('negotiation intelligence drawer section comment exists', () => {
  assert.match(css, /\/\* Negotiation Intelligence drawer \*\//);
});

test('close button meets minimum touch target', () => {
  const closeBlock = css.match(/\.ai-neg-panel__close\s*\{[\s\S]*?\}/);
  assert.ok(closeBlock, 'expected .ai-neg-panel__close block');
  assert.match(closeBlock[0], /min-width:\s*44px/);
  assert.match(closeBlock[0], /min-height:\s*44px/);
});
