import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function settingsPageBlock(html) {
  const match = html.match(/id="page-settings"[\s\S]*?id="page-content"/);
  assert.ok(match, 'page-settings block exists');
  return match[0];
}

test('admin settings page exposes ai_listings_public_enabled toggle', () => {
  const html = read('admin-panel.html');
  const block = settingsPageBlock(html);

  assert.match(block, /id="s-ai_listings_public_enabled"/);
  assert.match(block, /Public AI ilan kataloğu \(\/secenekler\)/);
  assert.match(block, /Yayında \(published\)/i);
  assert.match(block, /AI_LISTINGS_SUPABASE_ENABLED/);
  assert.match(block, /AI_LISTINGS_PUBLIC_PUBLISH_ENABLED/);
});

test('admin panel and admin-action wire ai_listings_public_enabled setting', () => {
  const panel = read('js/admin-panel.js');
  const adminAction = read('supabase/functions/admin-action/index.ts');

  assert.match(panel, /BOOLEAN_SETTING_KEYS[\s\S]*'ai_listings_public_enabled'/);
  assert.match(adminAction, /"ai_listings_public_enabled"/);
});
