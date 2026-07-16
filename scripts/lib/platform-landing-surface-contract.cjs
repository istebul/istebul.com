/**
 * EPIC-002 — Release Source of Truth
 *
 * Platform Landing (`/`) vs AI Landing (`/ai/`) surface markers + sitemap contract.
 * All release audits / SEO gates must consume this module — do not re-list markers.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PLATFORM_ROOT_REQUIRED = Object.freeze([
  'id="platform-landing"',
  'id="neden-istebul"'
]);

const AI_ROOT_FORBIDDEN_ON_PLATFORM = Object.freeze([
  'id="hero-v4-title"',
  'id="how-it-works"',
  'id="pricing"',
  'id="landing-faq"',
  'id="home"'
]);

const AI_LANDING_REQUIRED = Object.freeze([
  'id="hero-v4-title"',
  'id="how-it-works"',
  'id="pricing"',
  'id="landing-faq"',
  'id="home"'
]);

/** Absolute locs that must appear in generated sitemap (site.json + generateSitemap). */
const REQUIRED_SITEMAP_LOCS = Object.freeze([
  'https://www.istebul.com/',
  'https://www.istebul.com/ai/',
  'https://www.istebul.com/sigorta/',
  'https://www.istebul.com/auto/',
  'https://www.istebul.com/konut/'
]);

/**
 * Prefer post-build dist sitemap so restore cannot mask generateSitemap output.
 * Falls back to repo-root sitemap when dist is absent (pre-build static checks).
 * @param {string} root
 * @returns {{ path: string, xml: string, source: 'dist' | 'root' }}
 */
function resolveSitemapArtifact(root) {
  const distPath = path.join(root, 'dist', 'sitemap.xml');
  const rootPath = path.join(root, 'sitemap.xml');
  if (fs.existsSync(distPath)) {
    return { path: distPath, xml: fs.readFileSync(distPath, 'utf8'), source: 'dist' };
  }
  if (fs.existsSync(rootPath)) {
    return { path: rootPath, xml: fs.readFileSync(rootPath, 'utf8'), source: 'root' };
  }
  return { path: distPath, xml: '', source: 'dist' };
}

/**
 * @param {string} indexHtml
 * @param {string} aiHtml
 * @returns {string[]} failure messages (empty = OK)
 */
function collectPlatformAiSurfaceFailures(indexHtml, aiHtml) {
  const failures = [];
  if (!indexHtml) failures.push('index.html missing');
  if (!aiHtml) failures.push('ai/index.html missing');
  if (failures.length) return failures;

  for (const marker of PLATFORM_ROOT_REQUIRED) {
    if (!indexHtml.includes(marker)) {
      failures.push(`Platform Landing root missing ${marker}`);
    }
  }
  for (const marker of AI_ROOT_FORBIDDEN_ON_PLATFORM) {
    if (indexHtml.includes(marker)) {
      failures.push(`root must not host AI section ${marker}`);
    }
  }
  for (const marker of AI_LANDING_REQUIRED) {
    if (!aiHtml.includes(marker)) {
      failures.push(`AI Landing missing ${marker}`);
    }
  }
  return failures;
}

/**
 * @param {string} sitemapXml
 * @param {{ locs?: readonly string[] }} [options]
 * @returns {string[]}
 */
function collectSitemapContractFailures(sitemapXml, options = {}) {
  const failures = [];
  if (!sitemapXml) {
    failures.push('sitemap.xml missing or empty');
    return failures;
  }
  const locs = options.locs || REQUIRED_SITEMAP_LOCS;
  for (const loc of locs) {
    if (!sitemapXml.includes(loc)) {
      failures.push(`sitemap missing ${loc}`);
    }
  }
  return failures;
}

/**
 * Root + /ai HTML + preferred sitemap in one pass (shared by go-live / SEO gates).
 * @param {string} root
 * @returns {string[]}
 */
function collectReleaseContractFailures(root) {
  const indexPath = path.join(root, 'index.html');
  const aiPath = path.join(root, 'ai', 'index.html');
  const indexHtml = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
  const aiHtml = fs.existsSync(aiPath) ? fs.readFileSync(aiPath, 'utf8') : '';
  const { xml } = resolveSitemapArtifact(root);
  return [
    ...collectPlatformAiSurfaceFailures(indexHtml, aiHtml),
    ...collectSitemapContractFailures(xml)
  ];
}

module.exports = {
  PLATFORM_ROOT_REQUIRED,
  AI_ROOT_FORBIDDEN_ON_PLATFORM,
  AI_LANDING_REQUIRED,
  REQUIRED_SITEMAP_LOCS,
  resolveSitemapArtifact,
  collectPlatformAiSurfaceFailures,
  collectSitemapContractFailures,
  collectReleaseContractFailures
};
