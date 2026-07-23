/**
 * Legacy/orphan konut ve finance modüllerinin canlı HTML veya JS zincirine
 * yanlışlıkla geri bağlanmasını engelleyen guard testleri.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const SELF_TEST_FILE = path.join(root, 'tests/unit/no-deprecated-imports.test.mjs');

const FORBIDDEN_LEGACY = Object.freeze([
  'js/konut/konut-app.js',
  'js/konut/konut-engine.js',
  'js/konut/konut-config.js',
  'js/finance/finance-app.js',
  'js/finance/finance-ai.js',
  'js/finance/finance-calculator.js'
]);

const LEGACY_FILE_SET = new Set(FORBIDDEN_LEGACY.map((rel) => path.join(root, rel)));

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'artifacts',
  'docs',
  '.cursor'
]);

const JS_SCAN_ROOTS = ['js', 'tests', 'scripts'].map((rel) => path.join(root, rel));

const STATIC_IMPORT_RES = [
  /\bfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s+['"]([^'"]+)['"]/g
];
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const HTML_SCRIPT_SRC_RE = /\bsrc\s*=\s*["']([^"']+)["']/gi;

const HTML_FORBIDDEN_SCRIPT_RES = [
  /(?:^|\/)js\/konut\/konut-app\.js(?:\?|#|$)/i,
  /(?:^|\/)js\/finance\/finance-app\.js(?:\?|#|$)/i,
  /assets\/[^"']*\/konut-app\.js(?:\?|#|$)/i,
  /assets\/[^"']*\/finance-app\.js(?:\?|#|$)/i
];

function shouldSkipDir(name) {
  return SKIP_DIR_NAMES.has(name);
}

function walkFiles(startDir, onFile) {
  if (!fs.existsSync(startDir)) return;

  for (const entry of fs.readdirSync(startDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      walkFiles(path.join(startDir, entry.name), onFile);
      continue;
    }

    if (!entry.isFile()) continue;
    onFile(path.join(startDir, entry.name));
  }
}

function collectHtmlFiles() {
  const files = [];
  walkFiles(root, (filePath) => {
    if (!filePath.endsWith('.html')) return;
    files.push(filePath);
  });
  return files;
}

function collectJsLikeFiles() {
  const files = [];
  for (const scanRoot of JS_SCAN_ROOTS) {
    walkFiles(scanRoot, (filePath) => {
      if (!/\.(js|mjs|cjs)$/.test(filePath)) return;
      if (filePath === SELF_TEST_FILE) return;
      if (LEGACY_FILE_SET.has(filePath)) return;
      files.push(filePath);
    });
  }
  return files;
}

function normalizeRelativePath(fromFile, specifier) {
  const normalizedSpecifier = specifier.replace(/\\/g, '/');

  if (normalizedSpecifier.startsWith('.')) {
    const resolved = path.resolve(path.dirname(fromFile), normalizedSpecifier);
    return path.relative(root, resolved).split(path.sep).join('/');
  }

  if (normalizedSpecifier.startsWith('/')) {
    return normalizedSpecifier.replace(/^\//, '');
  }

  if (normalizedSpecifier.startsWith('js/')) {
    return normalizedSpecifier;
  }

  return null;
}

function matchesForbiddenLegacy(resolvedPath) {
  if (!resolvedPath) return null;

  const withJs = resolvedPath.endsWith('.js') ? resolvedPath : `${resolvedPath}.js`;
  if (FORBIDDEN_LEGACY.includes(withJs)) return withJs;
  if (FORBIDDEN_LEGACY.includes(resolvedPath)) return resolvedPath;
  return null;
}

function findImportViolations(filePath, content) {
  const violations = [];

  const inspectMatch = (specifier, kind, index) => {
    const resolved = normalizeRelativePath(filePath, specifier);
    const forbidden = matchesForbiddenLegacy(resolved);
    if (!forbidden) return;

    violations.push({
      file: path.relative(root, filePath),
      kind,
      specifier,
      forbidden,
      index
    });
  };

  for (const re of STATIC_IMPORT_RES) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(content)) !== null) {
      inspectMatch(match[1], 'static import', match.index);
    }
  }

  DYNAMIC_IMPORT_RE.lastIndex = 0;
  let dynamicMatch;
  while ((dynamicMatch = DYNAMIC_IMPORT_RE.exec(content)) !== null) {
    inspectMatch(dynamicMatch[1], 'dynamic import', dynamicMatch.index);
  }

  return violations;
}

function findHtmlScriptViolations(filePath, content) {
  const violations = [];
  const relFile = path.relative(root, filePath);

  HTML_SCRIPT_SRC_RE.lastIndex = 0;
  let match;
  while ((match = HTML_SCRIPT_SRC_RE.exec(content)) !== null) {
    const src = match[1];
    for (const pattern of HTML_FORBIDDEN_SCRIPT_RES) {
      if (pattern.test(src)) {
        violations.push({
          file: relFile,
          src,
          pattern: pattern.source
        });
        break;
      }
    }
  }

  return violations;
}

function formatImportViolations(violations) {
  return violations
    .map(
      ({ file, kind, specifier, forbidden }) =>
        `${file}: ${kind} '${specifier}' → forbidden legacy module ${forbidden}`
    )
    .join('\n');
}

function formatHtmlViolations(violations) {
  return violations.map(({ file, src }) => `${file}: script src '${src}'`).join('\n');
}

test('HTML entry dosyaları legacy konut/finance app scriptlerine bağlanmaz', () => {
  const violations = [];

  for (const htmlFile of collectHtmlFiles()) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    violations.push(...findHtmlScriptViolations(htmlFile, content));
  }

  assert.equal(
    violations.length,
    0,
    violations.length
      ? `Forbidden legacy HTML script wiring detected:\n${formatHtmlViolations(violations)}`
      : undefined
  );
});

test('JS import zinciri legacy konut/finance modüllerine bağlanmaz', () => {
  const violations = [];

  for (const jsFile of collectJsLikeFiles()) {
    const content = fs.readFileSync(jsFile, 'utf8');
    violations.push(...findImportViolations(jsFile, content));
  }

  assert.equal(
    violations.length,
    0,
    violations.length
      ? `Forbidden legacy JS import wiring detected:\n${formatImportViolations(violations)}`
      : undefined
  );
});

test('guard canlı konut/finans modüllerini yasaklamaz', () => {
  const liveMarkers = [
    'js/real-estate/real-estate-app.js',
    'js/konut/konut-flow.js',
    'js/konut/konut-wizard-profile.js',
    'js/finans/finans-app.js',
    'js/core/decision-options-api.js'
  ];

  for (const rel of liveMarkers) {
    assert.ok(fs.existsSync(path.join(root, rel)), `${rel} mevcut olmalı`);
    assert.equal(
      matchesForbiddenLegacy(rel),
      null,
      `${rel} guard tarafından yanlışlıkla yasaklanmamalı`
    );
  }
});
