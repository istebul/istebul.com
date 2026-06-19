import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSiteSocialLinks } from '../../js/runtime/site-social-links.js';

test('buildSiteSocialLinks normalizes handles and skips empty', () => {
  const links = buildSiteSocialLinks({
    instagram: '@istebul',
    twitter: 'https://x.com/istebul',
    facebook: '',
    linkedin: 'in/istebul'
  });
  assert.equal(links.length, 3);
  assert.equal(links[0].href, 'https://www.instagram.com/istebul');
  assert.equal(links[1].href, 'https://x.com/istebul');
  assert.equal(links[2].href, 'https://www.linkedin.com/in/istebul');
});
