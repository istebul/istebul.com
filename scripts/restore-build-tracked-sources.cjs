#!/usr/bin/env node
/**
 * Restore repo-root sources that `npm run build` may rewrite but should not dirty PR branches.
 * Deploy output in dist/ remains authoritative; these tracked paths stay pinned in git.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const BUILD_MUTATED_TRACKED = [
  'assets/images/sigorta-hero-1280.jpg',
  'assets/images/tatil-hero-1280.jpg',
  'hakkimizda.html',
  'iletisim.html',
  'metodoloji/index.html',
  'sitemap.xml',
  'veri-kaynaklari/index.html',
  'yardim.html'
];

function isTracked(relPath) {
  try {
    execSync(`git ls-files --error-unmatch -- "${relPath}"`, {
      cwd: root,
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
}

function isDirty(relPath) {
  try {
    execSync(`git diff --quiet -- "${relPath}"`, { cwd: root, stdio: 'ignore' });
    execSync(`git diff --cached --quiet -- "${relPath}"`, { cwd: root, stdio: 'ignore' });
    return false;
  } catch {
    return true;
  }
}

let restored = 0;

for (const rel of BUILD_MUTATED_TRACKED) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full) || !isTracked(rel) || !isDirty(rel)) continue;
  execSync(`git checkout -- "${rel}"`, { cwd: root, stdio: 'inherit' });
  restored += 1;
  console.log(`restore-build-tracked-sources: restored ${rel}`);
}

if (restored === 0) {
  console.log('restore-build-tracked-sources: OK (no build-mutated tracked sources to restore)');
} else {
  console.log(`restore-build-tracked-sources: OK (${restored} path(s) restored)`);
}
