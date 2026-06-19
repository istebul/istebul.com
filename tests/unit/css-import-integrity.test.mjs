import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const cssRoot = path.join(dist, 'css');

const IMPORT_RE = /@import\s*(?:url\()?['"]([^'"]+)['"]\)?/g;

function walkCssFiles(dir, callback) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkCssFiles(full, callback);
    else if (entry.isFile() && entry.name.endsWith('.css')) callback(full);
  }
}

function resolveImportTarget(fromFile, importPath) {
  if (/^(https?:|data:)/i.test(importPath)) return null;

  const fromDir = path.dirname(fromFile);
  const abs = path.resolve(fromDir, importPath);
  return abs;
}

function collectCssImports() {
  const missing = [];
  const checked = [];

  walkCssFiles(cssRoot, (file) => {
    const relFromDist = path.relative(dist, file).split(path.sep).join('/');
    const content = fs.readFileSync(file, 'utf8');
    let match;

    while ((match = IMPORT_RE.exec(content)) !== null) {
      const importPath = match[1];
      const target = resolveImportTarget(file, importPath);
      if (!target) continue;

      const relTarget = path.relative(dist, target).split(path.sep).join('/');
      checked.push({ from: relFromDist, importPath, relTarget });

      if (!fs.existsSync(target)) {
        missing.push({ from: relFromDist, importPath, relTarget });
      }
    }
  });

  return { missing, checked };
}

test('dist/css @import paths resolve to existing files', () => {
  assert.ok(fs.existsSync(dist), 'dist/ missing — run npm run build first');
  assert.ok(fs.existsSync(cssRoot), 'dist/css/ missing — run npm run build first');

  const { missing, checked } = collectCssImports();
  assert.ok(checked.length > 0, 'expected at least one @import in dist/css');

  if (missing.length) {
    const detail = missing
      .map(({ from, importPath, relTarget }) => `${from}: @import '${importPath}' → missing /${relTarget}`)
      .join('\n');
    assert.fail(`broken CSS @import references:\n${detail}`);
  }
});

test('auto-page.bundle.css imports hashed auto-results-v2.css that exists', () => {
  assert.ok(fs.existsSync(cssRoot), 'dist/css/ missing — run npm run build first');

  const bundleFiles = fs
    .readdirSync(path.join(cssRoot, 'bundles'))
    .filter((name) => name.startsWith('auto-page.bundle.') && name.endsWith('.css'));

  assert.equal(bundleFiles.length, 1, 'expected exactly one hashed auto-page.bundle.css in dist');

  const bundlePath = path.join(cssRoot, 'bundles', bundleFiles[0]);
  const content = fs.readFileSync(bundlePath, 'utf8');
  const importMatch = content.match(/@import\s*['"]\.\.\/auto-results-v2\.([a-f0-9]{10})\.css['"]/);

  assert.ok(importMatch, 'auto-page.bundle.css must @import ../auto-results-v2.<hash>.css');

  const hashedName = `auto-results-v2.${importMatch[1]}.css`;
  const hashedPath = path.join(cssRoot, hashedName);

  assert.ok(
    fs.existsSync(hashedPath),
    `auto-page.bundle.css references /css/${hashedName} but file is missing in dist`
  );
});
