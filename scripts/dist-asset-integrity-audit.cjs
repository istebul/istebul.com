#!/usr/bin/env node
/**
 * Post-build integrity: _redirects ordering, CSS MIME safety, broken asset refs.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dist = path.join(root, 'dist');
const errors = [];

if (!fs.existsSync(dist)) {
  console.error('dist-asset-integrity-audit: dist/ missing — run npm run build first');
  process.exit(1);
}

const redirectsPath = path.join(dist, '_redirects');
if (!fs.existsSync(redirectsPath)) {
  errors.push('dist/_redirects is missing');
} else {
  const lines = fs
    .readFileSync(redirectsPath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const spaFallbackIdx = lines.findIndex((l) => /^\s*\/\*\s+\/index\.html\s+200\s*$/.test(l));
  const staticPassthrough = lines.filter((l) =>
    /^\/(css|js|assets|images|fonts)\/\*\s/.test(l)
  );
  const requiredStatic = ['/css/*', '/js/*', '/assets/*', '/images/*', '/fonts/*'];
  for (const prefix of requiredStatic) {
    if (!staticPassthrough.some((l) => l.startsWith(prefix))) {
      errors.push(`_redirects missing static passthrough for ${prefix}`);
    }
  }
  if (spaFallbackIdx === -1) {
    errors.push('_redirects missing SPA fallback /* /index.html 200');
  } else if (spaFallbackIdx !== lines.length - 1) {
    errors.push('_redirects SPA fallback must be the last active rule');
  }
  for (let i = 0; i < staticPassthrough.length; i++) {
    const idx = lines.indexOf(staticPassthrough[i]);
    if (spaFallbackIdx !== -1 && idx > spaFallbackIdx) {
      errors.push(`static passthrough appears after SPA fallback: ${staticPassthrough[i]}`);
    }
  }
}

const walk = (dir, cb) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else if (entry.isFile()) cb(full);
  }
};

const distFiles = new Set();
walk(dist, (file) => {
  distFiles.add(path.relative(dist, file).split(path.sep).join('/'));
});

const unresolvedImportRe = /@import\s+['"]\.\/([^'"]+\.css)['"]/;
walk(path.join(dist, 'css'), (file) => {
  if (!file.endsWith('.css')) return;
  const rel = path.relative(dist, file).split(path.sep).join('/');
  const content = fs.readFileSync(file, 'utf8');
  const m = content.match(unresolvedImportRe);
  if (m && !/\.[a-f0-9]{10}\.css$/.test(m[1])) {
    errors.push(`CSS ${rel} has unhashed @import "./${m[1]}" (would 404 → text/html on Pages)`);
  }
});

const hrefRe = /(?:href|src)=["'](\/[^"']+)["']/g;
const checkedHtml = new Set();

walk(dist, (file) => {
  if (!file.endsWith('.html')) return;
  const rel = path.relative(dist, file).split(path.sep).join('/');
  if (checkedHtml.has(rel)) return;
  checkedHtml.add(rel);

  const html = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = hrefRe.exec(html)) !== null) {
    const url = match[1].split('?')[0].split('#')[0];
    if (!url.startsWith('/')) continue;
    if (url.startsWith('//')) continue;
    const assetPath = url.replace(/^\//, '');
    if (
      assetPath.endsWith('.html') ||
      assetPath.startsWith('http') ||
      assetPath === '' ||
      assetPath.includes('*')
    ) {
      continue;
    }
    if (/\.(css|js|json|ico|xml|txt|webmanifest|png|jpg|jpeg|gif|svg|woff2?|ttf|eot)$/i.test(assetPath)) {
      if (!distFiles.has(assetPath) && !distFiles.has(decodeURIComponent(assetPath))) {
        errors.push(`HTML ${rel} references missing asset /${assetPath}`);
      }
    }
  }
});

if (errors.length) {
  console.error('dist-asset-integrity-audit failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('dist-asset-integrity-audit: OK');
