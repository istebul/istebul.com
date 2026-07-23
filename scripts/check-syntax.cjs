const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const ignoredDirs = new Set([
  'node_modules',
  '.git',
  'recovered',
  'dist',
  'playwright-report',
  'test-results'
]);

const requiredAssets = [
  'assets/images/placeholder.svg',
  'assets/images/hero-illustration.svg',
  'assets/images/og-image.svg',
  'assets/images/og-image.png',
  'assets/brand/istebul-icon.svg',
  'assets/icons/favicon-16.png',
  'assets/icons/favicon-32.png',
  'assets/icons/favicon-192.png',
  'assets/icons/favicon-512.png',
  'favicon.ico'
];

const jsFiles = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(path.join(dir, entry.name));
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      jsFiles.push(path.join(dir, entry.name));
    }
  }
};

walk(root);

let failed = false;

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || result.stdout);
  }
}

for (const asset of requiredAssets) {
  const fullPath = path.join(root, asset);

  if (!fs.existsSync(fullPath)) {
    failed = true;
    process.stderr.write(`Missing required asset: ${asset}\n`);
  }
}

if (failed) process.exit(1);

console.log(`Checked ${jsFiles.length} JavaScript files.`);
