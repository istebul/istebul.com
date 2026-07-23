#!/usr/bin/env node
/**
 * Structural audit for Cloudflare Pages _headers cache policy.
 * Ensures runtime assets (env.js, sw.js, hashless /js/runtime/*) avoid long immutable cache.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const headersPath = path.join(root, '_headers');

function fail(message) {
  console.error(`cache-headers-audit: FAIL — ${message}`);
  process.exitCode = 1;
}

function parseHeadersFile(content) {
  const blocks = [];
  let current = null;

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    if (!line.startsWith(' ')) {
      if (current) blocks.push(current);
      current = { path: line.trim(), headers: {} };
      continue;
    }
    const idx = line.indexOf(':');
    if (idx === -1 || !current) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    current.headers[key] = value;
  }

  if (current) blocks.push(current);
  return blocks;
}

function getBlock(blocks, pattern) {
  return blocks.find((block) => block.path === pattern) || null;
}

function cacheControl(block) {
  return block?.headers['Cache-Control'] || '';
}

function hasNoStorePolicy(value) {
  const lower = value.toLowerCase();
  return (
    lower.includes('no-cache') &&
    lower.includes('no-store') &&
    lower.includes('must-revalidate')
  );
}

function hasLongImmutablePolicy(value) {
  const lower = value.toLowerCase();
  return lower.includes('max-age=31536000') && lower.includes('immutable');
}

function hasShortRevalidatePolicy(value) {
  const lower = value.toLowerCase();
  return lower.includes('max-age=3600') && lower.includes('must-revalidate') && !lower.includes('immutable');
}

const content = fs.readFileSync(headersPath, 'utf8');
const blocks = parseHeadersFile(content);
const errors = [];

const envBlock = getBlock(blocks, '/env.js');
if (!envBlock || !hasNoStorePolicy(cacheControl(envBlock))) {
  errors.push('/env.js must set Cache-Control: no-cache, no-store, must-revalidate');
}

const swBlock = getBlock(blocks, '/sw.js');
if (!swBlock || !hasNoStorePolicy(cacheControl(swBlock))) {
  errors.push('/sw.js must set Cache-Control: no-cache, no-store, must-revalidate');
}

const buildManifestBlock = getBlock(blocks, '/build-manifest.json');
if (!buildManifestBlock || !hasNoStorePolicy(cacheControl(buildManifestBlock))) {
  errors.push('/build-manifest.json must set Cache-Control: no-cache, no-store, must-revalidate');
}

const runtimeBlock = getBlock(blocks, '/js/runtime/*');
const runtimeCc = cacheControl(runtimeBlock);
if (!runtimeBlock || !hasShortRevalidatePolicy(runtimeCc)) {
  errors.push('/js/runtime/* must set Cache-Control: public, max-age=3600, must-revalidate (no immutable)');
} else if (runtimeCc.includes('31536000') || runtimeCc.toLowerCase().includes('immutable')) {
  errors.push('/js/runtime/* must not use max-age=31536000 or immutable');
}

const autoBlock = getBlock(blocks, '/js/auto/*');
const autoCc = cacheControl(autoBlock);
if (!autoBlock || !hasShortRevalidatePolicy(autoCc)) {
  errors.push('/js/auto/* must set Cache-Control: public, max-age=3600, must-revalidate (no immutable)');
} else if (autoCc.includes('31536000') || autoCc.toLowerCase().includes('immutable')) {
  errors.push('/js/auto/* must not use max-age=31536000 or immutable');
}

const appBundleBlock = getBlock(blocks, '/js/app.bundle-*');
if (!appBundleBlock || !hasLongImmutablePolicy(cacheControl(appBundleBlock))) {
  errors.push('/js/app.bundle-* must set Cache-Control: public, max-age=31536000, immutable');
}

const assetsBlock = getBlock(blocks, '/assets/*');
if (!assetsBlock || !hasLongImmutablePolicy(cacheControl(assetsBlock))) {
  errors.push('/assets/* must set Cache-Control: public, max-age=31536000, immutable');
}

const globalBlock = getBlock(blocks, '/*');
const rootBlock = getBlock(blocks, '/');
const htmlBlock = getBlock(blocks, '/*.html');
if (
  !hasNoStorePolicy(cacheControl(globalBlock)) ||
  !hasNoStorePolicy(cacheControl(rootBlock)) ||
  !hasNoStorePolicy(cacheControl(htmlBlock))
) {
  errors.push('/*, /, and /*.html must keep Cache-Control: no-cache, no-store, must-revalidate');
}

const wildcardJsBlock = getBlock(blocks, '/*.js');
if (wildcardJsBlock && hasLongImmutablePolicy(cacheControl(wildcardJsBlock))) {
  errors.push('/*.js must not set public, max-age=31536000, immutable (captures /env.js and /sw.js)');
}

const broadJsBlock = getBlock(blocks, '/js/*');
if (broadJsBlock && hasLongImmutablePolicy(cacheControl(broadJsBlock))) {
  errors.push('/js/* must not set public, max-age=31536000, immutable (captures hashless runtime JS)');
}

if (errors.length) {
  for (const message of errors) {
    fail(message);
  }
  process.exit(process.exitCode || 1);
}

console.log('cache-headers-audit: PASS');
console.log('- /env.js, /sw.js, /build-manifest.json: no-store policy');
console.log('- /js/runtime/*, /js/auto/*: short cache (max-age=3600, must-revalidate)');
console.log('- /js/app.bundle-*, /assets/*: long immutable cache preserved');
console.log('- no broad /*.js or /js/* immutable rules');
