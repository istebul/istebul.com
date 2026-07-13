const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps', 'restaurant-admin-erp');
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
  console.log('[erp] Restaurant Admin ERP TypeScript check passed.');
  process.exit(0);
}

const build = spawnSync(
  process.execPath,
  [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--config', path.join(appDir, 'vite.config.ts')],
  { cwd: appDir, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } },
);

if (build.status !== 0) {
  process.exit(build.status || 1);
}

console.log('[erp] Restaurant Admin ERP dashboard built to dist/garson/erp/');
