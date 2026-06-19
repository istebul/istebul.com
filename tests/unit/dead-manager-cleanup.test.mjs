/**
 * P0-5 guard: dead ListingManager / ProfileManager modules stay removed;
 * profile save uses API.updateProfile (not app.profil).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const SELF_TEST_FILE = path.join(root, 'tests/unit/dead-manager-cleanup.test.mjs');

const REMOVED_MANAGER_FILES = Object.freeze([
  'js/features/ilan/ilan.js',
  'js/features/profil/profil.js'
]);

const FORBIDDEN_RUNTIME_PATTERNS = Object.freeze([
  { label: 'new ListingManager', re: /\bnew\s+ListingManager\b/ },
  { label: 'new ProfileManager', re: /\bnew\s+ProfileManager\b/ },
  { label: 'app.profil', re: /\bapp\.profil\b/ },
  { label: 'this.profil assignment', re: /\bthis\.profil\s*=/ },
  { label: 'this.ilan assignment', re: /\bthis\.ilan\s*=/ },
  {
    label: 'ilan.js manager import',
    re: /features\/ilan\/ilan\.js/
  },
  {
    label: 'profil.js manager import',
    re: /features\/profil\/profil\.js/
  }
]);

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'artifacts',
  '.cursor'
]);

const SCAN_ROOTS = ['js', 'tests', 'scripts'].map((rel) => path.join(root, rel));

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

function collectScannableFiles() {
  const files = [];
  for (const scanRoot of SCAN_ROOTS) {
    walkFiles(scanRoot, (filePath) => {
      if (!/\.(js|mjs|cjs)$/.test(filePath)) return;
      if (filePath === SELF_TEST_FILE) return;
      files.push(filePath);
    });
  }
  return files;
}

function findPatternViolations(content, patterns) {
  const violations = [];
  for (const { label, re } of patterns) {
    re.lastIndex = 0;
    if (re.test(content)) {
      violations.push(label);
    }
  }
  return violations;
}

test('dead manager export dosyaları repo içinde yok', () => {
  for (const rel of REMOVED_MANAGER_FILES) {
    assert.equal(
      fs.existsSync(path.join(root, rel)),
      false,
      `${rel} kaldırılmış olmalı`
    );
  }
});

test('runtime kodunda ListingManager / ProfileManager / app.profil kalıntısı yok', () => {
  const violations = [];

  for (const filePath of collectScannableFiles()) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hits = findPatternViolations(content, FORBIDDEN_RUNTIME_PATTERNS);
    if (!hits.length) continue;

    violations.push({
      file: path.relative(root, filePath),
      hits
    });
  }

  assert.equal(
    violations.length,
    0,
    violations.length
      ? `Forbidden dead-manager runtime references:\n${violations
          .map(({ file, hits }) => `${file}: ${hits.join(', ')}`)
          .join('\n')}`
      : undefined
  );
});

test('account.js profil kaydı API.updateProfile kullanır', () => {
  const accountPath = path.join(root, 'js/features/account/account.js');
  const content = fs.readFileSync(accountPath, 'utf8');

  assert.match(content, /\bAPI\.updateProfile\b/, 'account.js API.updateProfile çağırmalı');
  assert.doesNotMatch(
    content,
    /\bapp\.profil\.updateProfile\b/,
    'account.js app.profil.updateProfile kullanmamalı'
  );
});
