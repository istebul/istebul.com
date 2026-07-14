const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps', 'restaurant-customer-cx');
const typecheckOnly = process.argv.includes('--typecheck-only');

const typecheck = spawnSync(
  process.execPath,
  [path.join(root, 'node_modules/typescript/bin/tsc'), '-p', path.join(appDir, 'tsconfig.json'), '--noEmit'],
  { cwd: root, stdio: 'inherit' },
);

if (typecheck.status !== 0) {
  process.exit(typecheck.status || 1);
}

if (typecheckOnly) {
  console.log('[cx] Restaurant Customer CX TypeScript check passed.');
  process.exit(0);
}

const outDir = path.join(root, 'dist', 'r');
fs.mkdirSync(outDir, { recursive: true });

const build = spawnSync(
  process.execPath,
  [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--config', path.join(appDir, 'vite.config.ts')],
  { cwd: appDir, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } },
);

if (build.status !== 0) {
  process.exit(build.status || 1);
}

const onaySource = path.join(root, 'r', 'onay');
const onayDest = path.join(outDir, 'onay');
if (fs.existsSync(onaySource)) {
  fs.mkdirSync(onayDest, { recursive: true });
  for (const file of fs.readdirSync(onaySource)) {
    fs.copyFileSync(path.join(onaySource, file), path.join(onayDest, file));
  }
}

// Directory shells for hosts without rewrite support (Cloudflare still uses /r/* → index.html)
const indexHtml = path.join(outDir, 'index.html');
if (fs.existsSync(indexHtml)) {
  for (const slug of ['demo-cafe']) {
    const slugDir = path.join(outDir, slug);
    fs.mkdirSync(slugDir, { recursive: true });
    fs.copyFileSync(indexHtml, path.join(slugDir, 'index.html'));
  }
}

console.log('[cx] Restaurant Customer CX built to dist/r/ (P7-J · /r/{slug})');
