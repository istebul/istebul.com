#!/usr/bin/env node
/**
 * Static brand system checks for CI.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const required = [
  'docs/BRAND_SYSTEM.md',
  'docs/BRAND_CONSISTENCY_CHECKLIST.md',
  'data/brand/brand-system.json',
  'css/design-tokens.css',
  'js/core/brand-voice.js'
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`Missing brand artifact: ${rel}`);
    failed = true;
  }
}

const styleCss = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
if (!styleCss.includes("design-tokens.css")) {
  console.error('style.css must import design-tokens.css first in cascade');
  failed = true;
}

const brandJson = JSON.parse(
  fs.readFileSync(path.join(root, 'data/brand/brand-system.json'), 'utf8')
);
const primaryCta = brandJson.cta?.primary;
if (!primaryCta) {
  console.error('brand-system.json must define cta.primary');
  failed = true;
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (primaryCta && !indexHtml.includes(primaryCta)) {
  console.error(`index.html must include primary CTA: ${primaryCta}`);
  failed = true;
}

for (const phrase of brandJson.consistency?.bannedPhrases || []) {
  if (indexHtml.toLocaleLowerCase('tr-TR').includes(phrase.toLocaleLowerCase('tr-TR'))) {
    console.error(`index.html contains banned brand phrase: ${phrase}`);
    failed = true;
  }
}

const voiceJs = fs.readFileSync(path.join(root, 'js/core/brand-voice.js'), 'utf8');
if (!voiceJs.includes(primaryCta)) {
  console.error('brand-voice.js must export primary CTA matching brand-system.json');
  failed = true;
}

if (failed) process.exit(1);
console.log('Brand audit static checks passed.');
