/**
 * Client JS içinde literal fetch('/ai-proxy') kullanımını engelleyen guard.
 * Aktif AI yolu postAiProxy / fetchInsightWithProxy / API.askAI üzerinden kalmalı.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const JS_ROOT = path.join(root, 'js');

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'artifacts',
  '.cache',
  'cache'
]);

const DIRECT_AI_PROXY_FETCH_RES = [
  /\bfetch\s*\(\s*['"]\/ai-proxy['"]/g
];

function shouldSkipDir(name) {
  return SKIP_DIR_NAMES.has(name);
}

function walkJsFiles(startDir, onFile) {
  if (!fs.existsSync(startDir)) return;

  for (const entry of fs.readdirSync(startDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      walkJsFiles(path.join(startDir, entry.name), onFile);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    onFile(path.join(startDir, entry.name));
  }
}

function collectClientJsFiles() {
  const files = [];
  walkJsFiles(JS_ROOT, (filePath) => files.push(filePath));
  return files;
}

function findDirectAiProxyFetchViolations(filePath, content) {
  const violations = [];
  const relFile = path.relative(root, filePath);

  for (const re of DIRECT_AI_PROXY_FETCH_RES) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(content)) !== null) {
      violations.push({
        file: relFile,
        index: match.index,
        snippet: match[0]
      });
    }
  }

  return violations;
}

function formatViolations(violations) {
  return violations
    .map(({ file, snippet }) => `${file}: literal direct AI proxy fetch (${snippet})`)
    .join('\n');
}

test('client JS dosyaları literal fetch("/ai-proxy") kullanmaz', () => {
  const violations = [];

  for (const jsFile of collectClientJsFiles()) {
    const content = fs.readFileSync(jsFile, 'utf8');
    violations.push(...findDirectAiProxyFetchViolations(jsFile, content));
  }

  assert.equal(
    violations.length,
    0,
    violations.length
      ? `Direct /ai-proxy fetch detected in client JS:\n${formatViolations(violations)}`
      : undefined
  );
});

test('guard postAiProxy ve endpoint config kullanımını yasaklamaz', () => {
  const aiProxyClientPath = path.join(root, 'js/core/ai-proxy-client.js');
  const content = fs.readFileSync(aiProxyClientPath, 'utf8');

  assert.match(content, /\bpostAiProxy\b/);
  assert.match(content, /DEFAULT_AI_PROXY_ENDPOINT\s*=\s*['"]\/ai-proxy['"]/);
  assert.doesNotMatch(content, /\bfetch\s*\(\s*['"]\/ai-proxy['"]/);
});
