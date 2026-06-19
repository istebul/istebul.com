#!/usr/bin/env node
/**
 * P16-3A/3B/4A-2/4B — LinkedIn operasyon asistanı audit.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const mustExist = [
  'js/features/ops/linkedin-ops-lint-views.js',
  'js/features/ops/linkedin-ops-plan-views.js',
  'js/features/ops/linkedin-ops-template-views.js',
  'js/features/ops/linkedin-ops-comment-suggestions.js',
  'js/features/ops/linkedin-ops-comment-views.js',
  'tests/unit/linkedin-ops-comment-views.test.mjs',
  'js/admin/linkedin-ops-assistant.js',
  'css/admin-linkedin-ops.css',
  'js/features/ops/linkedin-brand-lint.js',
  'data/ops/linkedin-weekly-plan.json',
  'data/ops/linkedin-templates.json'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('data-page-target="linkedin-ops-assistant"')) {
  fail('admin-panel.html missing nav data-page-target="linkedin-ops-assistant"');
}
if (!adminHtml.includes('id="page-linkedin-ops-assistant"')) {
  fail('admin-panel.html missing id="page-linkedin-ops-assistant"');
}
if (!adminHtml.includes('id="linkedin-ops-assistant-root"')) {
  fail('admin-panel.html missing id="linkedin-ops-assistant-root"');
}
if (!adminHtml.includes('/css/admin-linkedin-ops.css')) {
  fail('admin-panel.html missing css/admin-linkedin-ops.css reference');
}
if (!adminHtml.includes('LinkedIn Operasyon Asistanı')) {
  fail('admin-panel.html missing LinkedIn Operasyon Asistanı label');
}

const routing = fs.readFileSync(path.join(root, 'js/admin/admin-page-routing.js'), 'utf8');
if (!routing.includes("'linkedin-ops-assistant'")) {
  fail('admin-page-routing.js missing linkedin-ops-assistant in ADMIN_PAGE_IDS');
}
if (!routing.includes("'linkedin-ops': 'linkedin-ops-assistant'")) {
  fail('admin-page-routing.js missing linkedin-ops path alias');
}

const shell = fs.readFileSync(path.join(root, 'js/admin/admin-shell.js'), 'utf8');
if (!shell.includes("'linkedin-ops-assistant': 'LinkedIn Operasyon Asistanı'")) {
  fail('admin-shell.js missing linkedin-ops-assistant NAV_LABELS entry');
}

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('refreshLinkedInOpsAssistant')) {
  fail('admin-panel.js missing refreshLinkedInOpsAssistant');
}
if (!adminJs.includes("'linkedin-ops-assistant':")) {
  fail('admin-panel.js missing linkedin-ops-assistant handler registration');
}
if (!adminJs.includes("import('./admin/linkedin-ops-assistant.js')")) {
  fail('admin-panel.js must dynamically import linkedin-ops-assistant loader');
}

const loader = fs.readFileSync(path.join(root, 'js/admin/linkedin-ops-assistant.js'), 'utf8');
for (const id of [
  'linkedin-ops-plan-section',
  'linkedin-ops-template-section',
  'linkedin-ops-comment-section',
  'linkedin-ops-lint-section'
]) {
  if (!loader.includes(id)) fail(`linkedin-ops-assistant.js missing #${id}`);
}
if (!loader.includes('renderLinkedInCommentPanel')) {
  fail('linkedin-ops-assistant.js must call renderLinkedInCommentPanel');
}
if (!loader.includes('bindLinkedInCommentPanel')) {
  fail('linkedin-ops-assistant.js must call bindLinkedInCommentPanel');
}
if (!loader.includes('OPS_JSON_EMBED')) {
  fail('linkedin-ops-assistant.js must read OPS_JSON_EMBED');
}
if (!loader.includes("'linkedin-weekly-plan'")) {
  fail('linkedin-ops-assistant.js must read linkedin-weekly-plan embed key');
}
if (!loader.includes("'linkedin-templates'")) {
  fail('linkedin-ops-assistant.js must read linkedin-templates embed key');
}

const forbiddenRuntimePatterns = [
  /\bfetch\s*\(/,
  /\blocalStorage\b/,
  /ai-proxy/,
  /openai/i,
  /\bgroq\b/i,
  /fetchOpsJson/,
  /\bsupabase\b/i,
  /\bcompletionState\b/,
  /\bdueCard\b/,
  /linkedin\.com/i
];
const clipboardForbiddenRuntimePatterns = [/navigator\.clipboard/];
const execCommandForbiddenPatterns = [/execCommand/];
const runtimeFiles = [
  'js/admin/linkedin-ops-assistant.js',
  'js/features/ops/linkedin-ops-plan-views.js',
  'js/features/ops/linkedin-ops-template-views.js',
  'js/features/ops/linkedin-ops-lint-views.js',
  'js/features/ops/linkedin-ops-comment-views.js',
  'js/features/ops/linkedin-ops-comment-suggestions.js'
];
const clipboardAllowedFile = 'js/features/ops/linkedin-ops-comment-views.js';

for (const rel of runtimeFiles) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const pattern of forbiddenRuntimePatterns) {
    if (pattern.test(source)) {
      fail(`${rel} must not use forbidden runtime pattern: ${pattern}`);
    }
  }
  for (const pattern of execCommandForbiddenPatterns) {
    if (pattern.test(source)) {
      fail(`${rel} must not use forbidden runtime pattern: ${pattern}`);
    }
  }
  if (rel !== clipboardAllowedFile) {
    for (const pattern of clipboardForbiddenRuntimePatterns) {
      if (pattern.test(source)) {
        fail(`${rel} must not use forbidden runtime pattern: ${pattern}`);
      }
    }
  }
  const lower = source.toLowerCase();
  if (/\bauto-post\b/.test(lower) || /\bauto-comment\b/.test(lower)) {
    fail(`${rel} must not reference auto-post/auto-comment behavior`);
  }
  if (!rel.includes('plan-views')) {
    if (lower.includes('linkedin api') || lower.includes('scraping')) {
      fail(`${rel} must not reference linkedin api or scraping`);
    }
    if (lower.includes('otomatik paylaşım')) {
      fail(`${rel} must not reference otomatik paylaşım`);
    }
    if (lower.includes('otomatik yorum') && !lower.includes('otomatik yorum göndermez')) {
      fail(`${rel} must not reference otomatik yorum except disclosure negation`);
    }
  }
}

const planViews = fs.readFileSync(
  path.join(root, 'js/features/ops/linkedin-ops-plan-views.js'),
  'utf8'
);
if (!planViews.includes('Haftalık LinkedIn Planı')) {
  fail('linkedin-ops-plan-views.js missing plan section title');
}
if (!planViews.includes('linkedin-ops-plan-table')) {
  fail('linkedin-ops-plan-views.js missing plan table');
}

const templateViews = fs.readFileSync(
  path.join(root, 'js/features/ops/linkedin-ops-template-views.js'),
  'utf8'
);
if (!templateViews.includes('LinkedIn Template Kataloğu')) {
  fail('linkedin-ops-template-views.js missing template section title');
}
if (!templateViews.includes('linkedin-ops-template-table')) {
  fail('linkedin-ops-template-views.js missing template summary table');
}

const lintViews = fs.readFileSync(
  path.join(root, 'js/features/ops/linkedin-ops-lint-views.js'),
  'utf8'
);
for (const id of [
  'linkedin-lint-input',
  'linkedin-lint-action-type',
  'linkedin-lint-run',
  'linkedin-lint-results'
]) {
  if (!lintViews.includes(id)) fail(`linkedin-ops-lint-views.js missing #${id}`);
}
if (!lintViews.includes('lintLinkedInText')) {
  fail('linkedin-ops-lint-views.js must import lintLinkedInText');
}
if (!lintViews.includes('Marka Uyum Kontrolü')) {
  fail('linkedin-ops-lint-views.js must keep lint section title');
}

const commentViews = fs.readFileSync(
  path.join(root, 'js/features/ops/linkedin-ops-comment-views.js'),
  'utf8'
);
for (const id of [
  'linkedin-comment-post-text',
  'linkedin-comment-account-type',
  'linkedin-comment-language',
  'linkedin-comment-generate',
  'linkedin-comment-results'
]) {
  if (!commentViews.includes(id)) fail(`linkedin-ops-comment-views.js missing #${id}`);
}
if (!commentViews.includes('suggestLinkedInComments')) {
  fail('linkedin-ops-comment-views.js must import suggestLinkedInComments');
}
if (!commentViews.includes('Üçüncü Taraf Yorum Önerisi')) {
  fail('linkedin-ops-comment-views.js missing comment section title');
}
if (
  !commentViews.includes('manuel inceleme') &&
  !commentViews.includes('otomatik yorum göndermez')
) {
  fail('linkedin-ops-comment-views.js must include manual workflow disclosure');
}
if (!commentViews.includes('Yorumu kopyala')) {
  fail('linkedin-ops-comment-views.js must include copy button label');
}
if (!commentViews.includes('data-comment-copy-index')) {
  fail('linkedin-ops-comment-views.js must include data-comment-copy-index');
}
if (!commentViews.includes('linkedin-comment-copy-status')) {
  fail('linkedin-ops-comment-views.js must include linkedin-comment-copy-status');
}
if (!commentViews.includes('navigator.clipboard.writeText')) {
  fail('linkedin-ops-comment-views.js must use navigator.clipboard.writeText for copy UX');
}
if (/execCommand/.test(commentViews)) {
  fail('linkedin-ops-comment-views.js must not use execCommand clipboard fallback');
}

const opsAiLoader = fs.readFileSync(path.join(root, 'js/admin/ops-ai-assistant.js'), 'utf8');
for (const forbidden of [
  'linkedin-ops-assistant',
  'linkedin-brand-lint',
  'lintLinkedInText',
  'linkedin-ops-comment',
  'suggestLinkedInComments'
]) {
  if (opsAiLoader.includes(forbidden)) {
    fail(`ops-ai-assistant.js must not reference ${forbidden}`);
  }
}

const publicRuntimeFiles = [
  'index.html',
  'js/app.js',
  'auto/index.html',
  'konut/index.html',
  'finans/index.html',
  'tatil/index.html'
];
for (const rel of publicRuntimeFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const source = fs.readFileSync(abs, 'utf8');
  if (source.includes('linkedin-ops-assistant')) {
    fail(`public runtime file must not reference linkedin-ops-assistant: ${rel}`);
  }
  if (source.includes('linkedin-ops-comment')) {
    fail(`public runtime file must not reference linkedin-ops-comment: ${rel}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts.test?.includes('p16-linkedin-ops-audit')) {
  fail('package.json test must include p16-linkedin-ops-audit');
}

if (failed) process.exit(1);
console.log('P16 LinkedIn ops assistant audit OK');
