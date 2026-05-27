import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedOrigin,
  resolveCorsOrigin,
  PAGES_PREVIEW_ORIGIN_RE
} from '../../functions/_shared/cors-origins.js';

test('allows production and project pages.dev origins', () => {
  assert.equal(isAllowedOrigin('https://www.istebul.com'), true);
  assert.equal(isAllowedOrigin('https://istebul.com'), true);
  assert.equal(isAllowedOrigin('https://istebul-com.pages.dev'), true);
});

test('allows hashed Cloudflare Pages preview deployments', () => {
  assert.equal(isAllowedOrigin('https://8fe0aca7.istebul-com.pages.dev'), true);
  assert.equal(PAGES_PREVIEW_ORIGIN_RE.test('https://8fe0aca7.istebul-com.pages.dev'), true);
});

test('allows branch-style Cloudflare Pages preview hosts', () => {
  assert.equal(isAllowedOrigin('https://cursor-staging.istebul-com.pages.dev'), true);
});

test('rejects unrelated origins', () => {
  assert.equal(isAllowedOrigin('https://evil.example.com'), false);
  assert.equal(isAllowedOrigin('https://istebul-com.evil.pages.dev'), false);
});

test('resolveCorsOrigin falls back for unknown hosts', () => {
  assert.equal(resolveCorsOrigin('https://8fe0aca7.istebul-com.pages.dev'), 'https://8fe0aca7.istebul-com.pages.dev');
  assert.equal(resolveCorsOrigin('https://bad.test'), 'https://www.istebul.com');
});
