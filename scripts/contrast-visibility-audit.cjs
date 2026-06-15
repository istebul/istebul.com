#!/usr/bin/env node
/**
 * P0-1 static guard: kritik hero/CTA/nav selector'larının kaynak HTML'de varlığı.
 * Runtime kontrast/görünürlük için tests/e2e/contrast-visibility-guard.spec.mjs kullanılır.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

/** @type {Array<{ file: string, markers: string[], label?: string }>} */
const CRITICAL_SURFACES = [
  {
    label: 'Ana sayfa hero + kategori CTA',
    file: 'index.html',
    markers: ['id="hero-v4-title"', 'data-hero-cta-primary', 'id="home-category-grid"', 'id="home-vertical-focus"']
  },
  {
    label: 'Karar asistanı + seçenekler shell',
    file: 'index.html',
    markers: [
      'id="page-karar-analizi"',
      'id="premium-karar-analizi-root"',
      'id="ilanlar"',
      'id="active-category-label"',
      'id="listing-result-count"',
      'id="add-listing-btn"'
    ]
  },
  {
    label: '/auto/ hero CTA + nav-more',
    file: 'auto/index.html',
    markers: ['data-auto-hero-cta', 'id="auto-nav-more-btn"', 'class="ib-vertical-nav-more-btn"']
  },
  {
    label: '/tatil/ hero CTA',
    file: 'tatil/index.html',
    markers: ['id="vacation-hero-cta"', 'id="vacation-nav-more-btn"']
  },
  {
    label: '/sigorta/ hero CTA',
    file: 'sigorta/index.html',
    markers: ['id="sigorta-hero-cta"', 'id="sigorta-nav-more-btn"']
  },
  {
    label: '/kasko/ hero CTA',
    file: 'kasko/index.html',
    markers: ['id="kasko-hero-cta"', 'id="kasko-nav-more-btn"']
  },
  {
    label: 'Admin panel shell/nav',
    file: 'admin-panel.html',
    markers: ['id="admin-nav"', 'id="login-screen"', 'id="login-btn"', 'class="sidebar-brand-title"']
  },
  {
    label: 'AI listings admin başlık/CTA',
    file: 'admin/ai-listings.html',
    markers: [
      'ai-listings-admin__brand-title',
      'id="ai-listings-new-menu-btn"',
      'id="ai-listings-view-nav"',
      'id="ai-listings-sidebar"'
    ]
  }
];

const CSS_GUARDS = [
  ['css/style.css', 'sr-only'],
  ['css/style.css', ':focus-visible'],
  ['css/vertical-nav-more-v1.css', 'ib-vertical-nav-more'],
  ['css/admin-premium-polish.css', '--admin-ink'],
  ['css/admin-ai-listings.css', 'ai-listings-admin__brand-title']
];

let failed = false;

for (const surface of CRITICAL_SURFACES) {
  const filePath = path.join(root, surface.file);
  if (!fs.existsSync(filePath)) {
    console.error('MISSING FILE:', surface.file, `(${surface.label})`);
    failed = true;
    continue;
  }
  const source = read(surface.file);
  for (const marker of surface.markers) {
    if (!source.includes(marker)) {
      console.error('MISSING MARKER:', surface.file, marker, `— ${surface.label}`);
      failed = true;
    }
  }
}

for (const [file, needle] of CSS_GUARDS) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    console.error('MISSING CSS:', file);
    failed = true;
    continue;
  }
  if (!read(file).includes(needle)) {
    console.error('CSS GUARD FAILED:', file, 'must contain', needle);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`P0-1 contrast/visibility static audit passed (${CRITICAL_SURFACES.length} surfaces).`);
