#!/usr/bin/env node
/**
 * Sync Content-Security-Policy lines in _headers and netlify.toml from scripts/lib/csp-policy.cjs.
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

function patchNetlify(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  const needle = 'Content-Security-Policy = "';
  const start = text.indexOf(needle);
  if (start === -1) throw new Error('netlify.toml CSP line not found');
  const end = text.indexOf('"', start + needle.length);
  if (end === -1) throw new Error('netlify.toml CSP line malformed');
  text = `${text.slice(0, start + needle.length)}${CSP_PUBLIC}${text.slice(end)}`;
  fs.writeFileSync(filePath, text);
}

patchHeaders(path.join(root, '_headers'));
patchNetlify(path.join(root, 'netlify.toml'));
console.log('sync-csp-headers: OK');
