#!/usr/bin/env node
/**
 * Fail CI/build if dist HTML contains inline event handlers (CSP script-src-attr).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

const FORBIDDEN = [
  { label: 'onload="', re: /onload="/i },
  { label: 'onclick="', re: /onclick="/i },
  { label: 'onerror="', re: /onerror="/i },
  { label: 'onunload="', re: /onunload="/i }
];

if (!fs.existsSync(dist)) {
  console.error('dist-inline-handlers-audit: FAIL — dist/ missing (run npm run build first)');
  process.exit(1);
}

const hits = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.html')) {
      const text = fs.readFileSync(full, 'utf8');
      for (const { label, re } of FORBIDDEN) {
        if (re.test(text)) hits.push({ file: path.relative(root, full), label });
      }
    }
  }
};

walk(dist);

if (hits.length) {
  console.error('dist-inline-handlers-audit: FAIL — inline event handlers in dist HTML:');
  for (const h of hits) console.error(`  ${h.file}: ${h.label}`);
  process.exit(1);
}

console.log('dist-inline-handlers-audit: OK (no inline handlers in dist HTML)');
