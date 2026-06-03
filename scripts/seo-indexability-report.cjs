#!/usr/bin/env node
/**
 * Post-build SEO indexability report (noindex, sitemap, canonical, orphans, schema).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadJson, SEO_BUILD_DATE } = require('./lib/seo.cjs');
const { mergeGuidePage, estimatePageWords, TARGET_GUIDE_WORDS } = require('./lib/seo-guide-expansions.cjs');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const reportPath = path.join(root, 'docs', 'SEO_INDEXABILITY_REPORT.md');

function walkHtml(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkHtml(full, acc);
    else if (name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

function countNoindex(files) {
  const pages = [];
  files.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    if (/meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) {
      pages.push(path.relative(root, file));
    }
  });
  return pages;
}

function countSitemapUrls() {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  return (xml.match(/<loc>/g) || []).length;
}

function canonicalIssues(files) {
  const issues = [];
  const publicPaths = [
    'index.html',
    'auto/index.html',
    'konut/index.html',
    'tatil/index.html',
    'finans/index.html',
    'metodoloji/index.html',
    'sigorta/index.html',
    'kasko/index.html'
  ];
  publicPaths.forEach((rel) => {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) return;
    const html = fs.readFileSync(full, 'utf8');
    if (!/rel=["']canonical["']/i.test(html)) issues.push(`${rel}: missing canonical`);
    const m = html.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    if (m && !m[1].startsWith('https://www.istebul.com')) {
      issues.push(`${rel}: non-www canonical ${m[1]}`);
    }
  });
  return issues;
}

function schemaValidation(files) {
  let faqPages = 0;
  let breadcrumbGuides = 0;
  let invalidJson = 0;

  files.forEach((file) => {
    const rel = path.relative(dist, file).replace(/\\/g, '/');
    const html = fs.readFileSync(file, 'utf8');
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    blocks.forEach((match) => {
      try {
        JSON.parse(match[1]);
      } catch {
        invalidJson += 1;
      }
    });
    if (html.includes('FAQPage')) faqPages += 1;
    if (rel.startsWith('rehber/') && html.includes('BreadcrumbList')) breadcrumbGuides += 1;
  });

  return { faqPages, breadcrumbGuides, invalidJson };
}

function internalLinkCount(htmlFiles) {
  let links = 0;
  htmlFiles.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    links += (html.match(/href=["']\/rehber\//g) || []).length;
  });
  return links;
}

function orphanEstimate(sitemapLocs, distFiles) {
  const EXCLUDED_PREFIXES = [
    '/profil',
    '/favoriler',
    '/gecmis',
    '/messages',
    '/ilan-ekle',
    '/admin',
    '/offline'
  ];

  const htmlPaths = new Set(
    distFiles
      .map((f) => {
        const rel = path.relative(dist, f).replace(/\\/g, '/');
        if (rel === 'index.html') return 'https://www.istebul.com/';
        if (rel.endsWith('/index.html')) {
          const dir = rel.replace(/\/index\.html$/, '');
          return `https://www.istebul.com/${dir}/`;
        }
        if (rel.endsWith('.html')) {
          return `https://www.istebul.com/${rel}`;
        }
        return null;
      })
      .filter(Boolean)
  );

  const sitemapSet = new Set(sitemapLocs);
  let orphans = 0;
  htmlPaths.forEach((loc) => {
    const pathOnly = loc.replace('https://www.istebul.com', '');
    if (EXCLUDED_PREFIXES.some((p) => pathOnly.startsWith(p))) return;
    if (!sitemapSet.has(loc) && !sitemapSet.has(loc.replace(/\/$/, ''))) orphans += 1;
  });
  return orphans;
}

function main() {
  const landing = loadJson('data/seo/landing-pages.json');
  const guideStats = landing.pages.map((p) => {
    const merged = mergeGuidePage(p);
    const words = estimatePageWords(merged);
    return { slug: p.slug, words, meetsTarget: words >= TARGET_GUIDE_WORDS };
  });

  const distHtml = walkHtml(dist);
  const rootHtml = walkHtml(root).filter((f) => !f.includes(`${path.sep}dist${path.sep}`) && !f.includes('/admin'));
  const noindexPages = countNoindex([...rootHtml, ...distHtml]);
  const sitemapCount = countSitemapUrls();
  const sitemapXml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const sitemapLocs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const canonIssues = canonicalIssues(rootHtml);
  const schema = schemaValidation(distHtml.length ? distHtml : rootHtml);
  const rehberLinks = internalLinkCount(
    (distHtml.length ? distHtml : rootHtml).filter((f) => f.includes(`${path.sep}index.html`))
  );

  const indexableEstimate =
    rootHtml.filter((f) => {
      const html = fs.readFileSync(f, 'utf8');
      return !/noindex/i.test(html) && /<title>/i.test(html);
    }).length + (distHtml.length ? distHtml.filter((f) => f.includes('rehber')).length : 0);

  const body = `# SEO Indexability Report

**Generated:** ${SEO_BUILD_DATE}  
**Build artifact:** \`dist/\` ${distHtml.length ? 'present' : 'not found — run npm run build'}

## Summary

| Metric | Value |
|--------|-------|
| noindex pages (repo scan) | ${noindexPages.length} |
| sitemap URL count | ${sitemapCount} |
| canonical issues | ${canonIssues.length} |
| orphan HTML (vs sitemap) | ${orphanEstimate(sitemapLocs, distHtml)} |
| internal /rehber/ links (sample) | ${rehberLinks} |
| FAQ schema pages (scan) | ${schema.faqPages} |
| Rehber BreadcrumbList pages | ${schema.breadcrumbGuides} |
| Invalid JSON-LD blocks | ${schema.invalidJson} |
| Indexable public HTML (estimate) | ${indexableEstimate} |

## noindex pages

${noindexPages.length ? noindexPages.map((p) => `- \`${p}\``).join('\n') : '_None on public marketing paths (expected: admin-panel, partner onboarding)._'}

## Guide word counts (build-time merge)

| Slug | Words | ≥${TARGET_GUIDE_WORDS} target |
|------|-------|-------------------------------|
${guideStats.map((g) => `| ${g.slug} | ${g.words} | ${g.meetsTarget ? 'yes' : 'no'} |`).join('\n')}

## Canonical issues

${canonIssues.length ? canonIssues.map((c) => `- ${c}`).join('\n') : '_None detected on core vertical pages._'}

## Schema validation

- FAQPage occurrences: ${schema.faqPages}
- BreadcrumbList on /rehber/: ${schema.breadcrumbGuides}
- JSON-LD parse errors: ${schema.invalidJson}

## Required sitemap paths

${['/', '/auto/', '/konut/', '/tatil/', '/finans/', '/metodoloji/', '/karar-asistani/']
  .map((p) => {
    const loc = `https://www.istebul.com${p === '/' ? '/' : p}`;
    return `- ${loc}: ${sitemapXml.includes(loc) ? 'OK' : 'MISSING'}`;
  })
  .join('\n')}

## Notes

- Rehber pages are generated at build into \`dist/rehber/{slug}/\`.
- Legacy URLs \`/index.php/*\`, \`/cgi-sys/*\`, \`/2025/*\` → 410; \`/category/*\` → 301 home.
`;

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, body);
  console.log('seo-indexability-report: wrote', reportPath);
  console.log(body.split('\n').slice(0, 20).join('\n'));
}

main();
