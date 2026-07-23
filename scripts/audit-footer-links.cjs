#!/usr/bin/env node
/**
 * Footer link audit — validates index.html footer hrefs resolve after build.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const indexPath = path.join(root, 'index.html');

let failed = false;

function fail(msg) {
  console.error('FAIL:', msg);
  failed = true;
}

function extractFooterLinks(html) {
  const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/i);
  if (!footerMatch) return [];
  const block = footerMatch[0];
  const links = [];
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(block)) !== null) {
    links.push(m[1]);
  }
  return links;
}

const SPA_SHELL_OK = new Set([
  '/',
  '/planlar',
  '/blog',
  '/duyurular',
  '/kampanyalar',
  '/karar-asistani',
  '/karar-asistani'
]);

function resolveDistPath(href) {
  if (!href || href.startsWith('mailto:')) return null;
  if (href.startsWith('javascript:')) return { invalid: true };
  if (href === '#' || href.startsWith('#') || href.startsWith('/#')) return { hash: true };
  if (href.startsWith('http')) return { external: true };

  const hashIndex = href.indexOf('#');
  let p = href.split('?')[0];
  if (hashIndex >= 0) {
    p = p.slice(0, hashIndex) || '/';
  }
  const normalized = p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p;

  if (p.endsWith('/')) {
    const indexFile = path.join(dist, p, 'index.html');
    if (fs.existsSync(indexFile)) return { file: indexFile };
  }
  if (p.startsWith('/')) p = p.slice(1);
  const direct = path.join(dist, p);
  const sourceDirect = path.join(root, p);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return { file: direct };
  if (fs.existsSync(`${direct}/index.html`)) return { file: `${direct}/index.html` };
  if (fs.existsSync(sourceDirect) && fs.statSync(sourceDirect).isFile()) return { file: sourceDirect };

  const rootIndex = path.join(dist, 'index.html');
  if (fs.existsSync(rootIndex) && (SPA_SHELL_OK.has(normalized) || normalized.startsWith('/en'))) {
    return { spa: true };
  }

  return { missing: direct };
}

if (!fs.existsSync(indexPath)) {
  fail('index.html missing');
  process.exit(1);
}

const html = fs.readFileSync(indexPath, 'utf8');
const links = extractFooterLinks(html);
const seen = new Set();

const duplicateAllow = new Set(['/gizlilik.html', '/auto/', '/cerez-politikasi.html']);

for (const href of links) {
  if (seen.has(href) && !duplicateAllow.has(href)) {
    fail(`duplicate footer link: ${href}`);
    continue;
  }
  seen.add(href);

  if (href.includes('javascript:void')) {
    fail(`javascript:void footer link: ${href}`);
    continue;
  }

  if (href.includes('#')) {
    const hashPart = href.includes('#') ? href.split('#')[1] : '';
    const pathPart = href.split('#')[0] || '/kvkk.html';
    const anchor = hashPart.split('?')[0];
    if (!anchor) continue;
    let targetHtml = html;
    if (pathPart && pathPart !== '/' && !pathPart.startsWith('/#')) {
      const pagePath = pathPart.replace(/^\//, '').replace(/\/$/, '');
      const candidates = [
        path.join(dist, pagePath),
        path.join(dist, pagePath, 'index.html'),
        path.join(root, pagePath),
        path.join(root, pagePath, 'index.html')
      ];
      const hit = candidates.find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
      if (!hit) {
        fail(`footer hash page missing: ${href}`);
        continue;
      }
      targetHtml = fs.readFileSync(hit, 'utf8');
    }
    if (!targetHtml.includes(`id="${anchor}"`) && !targetHtml.includes(`id='${anchor}'`)) {
      fail(`footer hash target missing (${pathPart}): #${anchor}`);
    }
    continue;
  }

  const resolved = resolveDistPath(href);
  if (!resolved) continue;
  if (resolved.invalid) {
    fail(`invalid footer href: ${href}`);
    continue;
  }
  if (resolved.hash) continue;
  if (resolved.external) continue;
  if (resolved.missing) {
    fail(`footer link not in dist: ${href} → ${resolved.missing}`);
  }
  if (resolved.spa) {
    continue;
  }
}

const requiredGuides = [
  '/rehber/suv-mi-sedan-mi/',
  '/rehber/elektrikli-arac-rehberi/',
  '/rehber/finansman-rehberi/',
  '/rehber/tco-rehberi/',
  '/rehber/ikinci-el-rehberi/'
];

const fullPageNavSource = fs.readFileSync(path.join(root, 'js/runtime/full-page-navigation.js'), 'utf8');
if (!fullPageNavSource.includes('REHBER_PREFIX')) {
  fail('full-page-navigation.js must bypass SPA for /rehber/* links');
}

for (const guide of requiredGuides) {
  if (!links.includes(guide)) {
    fail(`footer missing required guide link: ${guide}`);
  }
}

const companyBlock = html.match(/<h4>Şirket<\/h4>[\s\S]*?<\/ul>/i)?.[0] || '';
if (/rehber\//i.test(companyBlock)) {
  fail('Şirket column must not contain /rehber/ links');
}

if (failed) process.exit(1);
console.log(`footer-links-audit: OK (${links.length} unique footer links, ${requiredGuides.length} guide URLs)`);
