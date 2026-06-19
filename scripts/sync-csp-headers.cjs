#!/usr/bin/env node
/**
 * Sync Content-Security-Policy lines in _headers from scripts/lib/csp-policy.cjs.
 */
const fs = require('fs');
const path = require('path');
const { CSP_PUBLIC, CSP_ADMIN } = require('./lib/csp-policy.cjs');

const root = path.join(__dirname, '..');

function patchHeaders(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  let adminMode = false;
  const out = lines.map((line) => {
    if (/^\/admin/.test(line.trim()) || line.trim() === '/admin-panel.html') {
      adminMode = true;
    } else if (/^\//.test(line.trim()) && !line.includes('Content-Security-Policy')) {
      adminMode = line.trim().startsWith('/admin');
    }
    if (!line.includes('Content-Security-Policy:')) return line;
    const csp = adminMode ? CSP_ADMIN : CSP_PUBLIC;
    return `  Content-Security-Policy: ${csp}`;
  });
  fs.writeFileSync(filePath, `${out.join('\n')}\n`);
}

patchHeaders(path.join(root, '_headers'));
console.log('sync-csp-headers: OK (_headers)');
