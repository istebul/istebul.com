import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const cssPath = join(root, 'css/auto-results-v2.css');
const css = readFileSync(cssPath, 'utf8');

const SCOPED = 'body\\.ib-auto #auto-results #ib-results-detail';

function scopedBlock(className) {
  const pattern = new RegExp(
    `${SCOPED} \\.${className}\\s*\\{[\\s\\S]*?\\}`,
    'm'
  );
  const match = css.match(pattern);
  assert.ok(match, `expected scoped block for .${className}`);
  return match[0];
}

function kararMahkemesiMobileBlock() {
  const blocks = css.match(/@media \(max-width: 520px\)\s*\{[\s\S]*?\n\}/g) || [];
  const match = blocks.find((block) => block.includes('.karar-mahkemesi-beta__metrics'));
  assert.ok(match, 'expected Karar Mahkemesi @media (max-width: 520px) block');
  return match;
}

test('auto-results-v2.css defines scoped Karar Mahkemesi beta root', () => {
  assert.match(
    css,
    /body\.ib-auto #auto-results #ib-results-detail \.karar-mahkemesi-beta\s*\{/
  );
  assert.doesNotMatch(css, /@import.*karar-mahkemesi/);
});

test('Karar Mahkemesi metrics use two-column grid with min-width safety', () => {
  const metricsBlock = scopedBlock('karar-mahkemesi-beta__metrics');
  assert.match(metricsBlock, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(metricsBlock, /gap:/);

  const metricBlock = scopedBlock('karar-mahkemesi-beta__metric');
  assert.match(metricBlock, /min-width:\s*0/);

  const rootBlock = scopedBlock('karar-mahkemesi-beta');
  assert.match(rootBlock, /min-width:\s*0/);
});

test('Karar Mahkemesi text nodes allow long-content wrap', () => {
  assert.match(css, new RegExp(`${SCOPED} \\.karar-mahkemesi-beta\\s*\\{[\\s\\S]*?overflow-wrap:\\s*anywhere`));
  assert.match(
    css,
    new RegExp(`${SCOPED} \\.karar-mahkemesi-beta__metric-value[\\s\\S]*?overflow-wrap:\\s*anywhere`)
  );
  assert.match(
    css,
    new RegExp(`${SCOPED} \\.karar-mahkemesi-beta__gerekce\\s*\\{[\\s\\S]*?overflow-wrap:\\s*anywhere`)
  );
  assert.match(
    css,
    new RegExp(`${SCOPED} \\.karar-mahkemesi-beta__disclaimer\\s*\\{[\\s\\S]*?overflow-wrap:\\s*anywhere`)
  );
});

test('Karar Mahkemesi mobile query stacks metrics to one column', () => {
  const mobileBlock = kararMahkemesiMobileBlock();
  assert.match(
    mobileBlock,
    new RegExp(`${SCOPED} \\.karar-mahkemesi-beta__metrics\\s*\\{[\\s\\S]*?grid-template-columns:\\s*1fr`)
  );
});

test('Karar Mahkemesi action colors stay scoped under data-aksiyon', () => {
  for (const slug of ['al', 'bekle', 'pazarlik', 'vazgec', 'daha-fazla-veri']) {
    assert.match(
      css,
      new RegExp(
        `${SCOPED} \\.karar-mahkemesi-beta\\[data-aksiyon='${slug}'\\] \\.karar-mahkemesi-beta__aksiyon`
      )
    );
  }
});
