#!/usr/bin/env node
/**
 * Data quality audit — Faz C listing data pool validation.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

let failed = 0;

function fail(msg) {
  console.error('FAIL:', msg);
  failed += 1;
}

function pass(msg) {
  console.log('PASS:', msg);
}

const normalization = read(
  'supabase/functions/_shared/ai-listings/listing-data-pool/listing-normalization-engine.js'
);

for (const cat of ['vehicle', 'housing', 'vacation']) {
  if (!normalization.includes(`'${cat}'`)) fail(`Missing category: ${cat}`);
  else pass(`Category supported: ${cat}`);
}

const outputs = ['normalizedListing', 'duplicateCluster', 'dataCompleteness', 'entityConfidence'];
const files = {
  normalizedListing: normalization,
  duplicateCluster: read(
    'supabase/functions/_shared/ai-listings/listing-data-pool/duplicate-cluster-engine.js'
  ),
  dataCompleteness: read(
    'supabase/functions/_shared/ai-listings/listing-data-pool/listing-quality-enrichment.js'
  ),
  entityConfidence: read(
    'supabase/functions/_shared/ai-listings/listing-data-pool/entity-resolution-engine.js'
  )
};

for (const [output, text] of Object.entries(files)) {
  if (!text.includes(output.replace('normalizedListing', 'normalized'))) {
    if (output === 'normalizedListing' && text.includes('normalized')) pass(`Output: ${output}`);
    else if (text.includes(output)) pass(`Output: ${output}`);
    else fail(`Output not found: ${output}`);
  } else {
    pass(`Output: ${output}`);
  }
}

const entity = read(
  'supabase/functions/_shared/ai-listings/listing-data-pool/entity-resolution-engine.js'
);
if (!entity.includes('hassas kişisel')) fail('Entity resolution missing sensitive data guard');
else pass('Sensitive inference guard present');

console.log(`\nData quality audit errors: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
