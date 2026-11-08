import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
const generator = fs.readFileSync(path.join(root, 'scripts/lib/seo.cjs'), 'utf8');

const blockedRoutes = [
  "/admin-panel",
  "/admin-panel.html",
  "/admin/",
  "/profil/",
  "/favoriler/",
  "/gecmis/",
  "/messages/",
  "/ilan-ekle/"
];
const patterns = [
  "/admin-panel",
  "/admin-panel.html",
  "/admin",
  "/admin/*",
  "/profil",
  "/profil/*",
  "/favoriler",
  "/favoriler/*",
  "/gecmis",
  "/gecmis/*",
  "/messages",
  "/messages/*",
  "/ilan-ekle",
  "/ilan-ekle/*",
  "/business",
  "/business/*",
  "/garson/giris",
  "/garson/giris/*",
  "/garson/basvuru",
  "/garson/basvuru/*",
  "/garson/demo",
  "/garson/demo/*",
  "/garson/erp",
  "/garson/erp/*",
  "/garson/mutfak",
  "/garson/mutfak/*",
  "/garson/panel",
  "/garson/panel/*",
  "/garson/zeka",
  "/garson/zeka/*",
  "/r",
  "/r/*",
  "/warehouse",
  "/warehouse/*",
  "/ilan-analizi",
  "/ilan-analizi/*",
  "/partner-basvuru.html",
  "/partner-onboarding.html",
  "/partner-closing-kit.html",
  "/platform-preview",
  "/platform-preview/*",
  "/abonelik-iptal.html",
  "/apps/restaurant-admin-erp/*",
  "/apps/restaurant-customer-cx/*"
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('robots.txt allows crawlers to discover private-route noindex headers', () => {
  const block = robots.split(/(?=^User-agent:)/m)
    .find(section => /^User-agent:\s*\*/m.test(section));
  assert.ok(block, 'Default user-agent block must exist');
  assert.match(block, /^Allow:\s*\/$/m);
  for (const route of blockedRoutes) {
    assert.doesNotMatch(
      block,
      new RegExp('^Disallow:\\s*' + escapeRegex(route) + '$', 'm'),
      route
    );
  }
  assert.doesNotMatch(generator, /Disallow:\/\/(?:admin-panel|admin\/|profil\/|favoriler\/|gecmis\/|messages\/|ilan-ekle\/)/);
});

test('all private and non-indexable routes have HTTP noindex headers', () => {
  for (const route of patterns) {
    const rule = new RegExp(
      '(?:^|\\n)' + escapeRegex(route) +
      '\\s*\\r?\\n[ \\t]+X-Robots-Tag: noindex, nofollow(?=\\r?\\n|$)',
      'm'
    );
    assert.match(headers, rule, route);
  }
});
