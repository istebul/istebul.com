#!/usr/bin/env node
/**
 * Installs a pre-push hook that runs `npm test` before every push.
 * Usage: node scripts/setup-git-hooks.cjs
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const hookDir = path.join(root, '.git', 'hooks');
const hookPath = path.join(hookDir, 'pre-push');

const hook = `#!/bin/sh
# Auto-installed by scripts/setup-git-hooks.cjs — do not commit
set -e
echo "pre-push: running npm test..."
cd "${root.replace(/\\/g, '/')}"
npm test
echo "pre-push: tests passed."
`;

if (!fs.existsSync(path.join(root, '.git'))) {
    console.error('Not a git repository; skipping hook install.');
    process.exit(1);
}

fs.mkdirSync(hookDir, { recursive: true });
fs.writeFileSync(hookPath, hook, { mode: 0o755 });
console.log('Installed pre-push hook → npm test');
