import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const indexPath = path.join(root, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

test('index.html has exactly one h1 and it is hero-v4-title', () => {
  const h1OpenTags = html.match(/<h1\b[^>]*>/gi) || [];
  assert.equal(h1OpenTags.length, 1, 'expected exactly one <h1> in index.html');
  assert.match(h1OpenTags[0], /id="hero-v4-title"/, 'sole h1 must be #hero-v4-title');
});

test('route shell sections outside #home have no h1 tags', () => {
  const homeStart = html.indexOf('<section id="home"');
  assert.notEqual(homeStart, -1, '#home section missing');

  const homeEnd = html.indexOf('</section>', homeStart);
  assert.notEqual(homeEnd, -1, '#home section not closed');

  const outsideHome = html.slice(homeEnd + '</section>'.length);
  const h1OutsideHome = outsideHome.match(/<h1\b/gi) || [];
  assert.equal(h1OutsideHome.length, 0, 'no h1 tags outside #home section');
});
