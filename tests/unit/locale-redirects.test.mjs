import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const lines = fs.readFileSync(
  new URL('../../_redirects', import.meta.url),
  'utf8'
).split(/\r?\n/).map(line => line.trim());

const locales = ['en', 'de', 'ar', 'it', 'fr', 'es', 'ja', 'zh'];

for (const locale of locales) {
  test('locale routing preserves /' + locale + '/', () => {
    const expected = [
      '/' + locale + ' /' + locale + '/ 301',
      '/' + locale + '/ /' + locale + '/index.html 200',
      '/' + locale + '/index.html /' + locale + '/ 301',
      '/' + locale + '/:first /:first 301',
      '/' + locale + '/:first/* /:first/:splat 301'
    ];

    for (const rule of expected) {
      assert.ok(lines.includes(rule), 'Missing redirect: ' + rule);
    }

    assert.ok(
      !lines.includes('/' + locale + '/* /:splat 301'),
      'Empty wildcard must not redirect locale homepage'
    );

    assert.ok(
      lines.indexOf(expected[2]) < lines.indexOf(expected[3]),
      'Static redirects must precede dynamic redirects'
    );
  });
}
