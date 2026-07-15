/**
 * EPIC-002 — single source for Platform Landing vs AI Landing HTML surface markers.
 * Used by SEO/indexability/release audits so root AI-homepage asserts are not duplicated.
 */
'use strict';

const PLATFORM_ROOT_REQUIRED = Object.freeze(['id="platform-landing"', 'id="neden-istebul"']);
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
  'id="landing-faq"'
]);

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

module.exports = {
  PLATFORM_ROOT_REQUIRED,
  AI_ROOT_FORBIDDEN_ON_PLATFORM,
  AI_LANDING_REQUIRED,
  collectPlatformAiSurfaceFailures
};
