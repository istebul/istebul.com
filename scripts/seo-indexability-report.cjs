#!/usr/bin/env node
/**
 * Post-build SEO indexability report (noindex, sitemap, canonical, orphans, schema).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadJson, SEO_BUILD_DATE } = require('./lib/seo.cjs');
const { mergeGuidePage, estimatePageWords, TARGET_GUIDE_WORDS } = require('./lib/seo-guide-expansions.cjs');
const { collectPlatformAiSurfaceFailures, resolveSitemapArtifact, collectSitemapContractFailures } = require('./lib/platform-landing-surface-contract.cjs');

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

function auditSitemapIndexability(sitemapLocs, distRoot) {
  const base = path.resolve(distRoot);
  const audit = {
    available: fs.existsSync(base),
    mapped: 0,
    missingHtml: [],
    invalidUrls: [],
    noindex: [],
    canonicalIssues: [],
    indexable: []
  };

  if (!audit.available) return audit;

  function getAttribute(tag, name) {
    const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    for (const match of tag.matchAll(pattern)) {
      if (match[1].toLowerCase() === name.toLowerCase()) {
        return match[2] ?? match[3] ?? match[4] ?? '';
      }
    }
    return '';
  }

  for (const rawLoc of sitemapLocs) {
    let pageUrl;
    let pathname;

    try {
      pageUrl = new URL(rawLoc);
      pathname = decodeURIComponent(pageUrl.pathname);
    } catch {
      audit.invalidUrls.push(rawLoc + ': invalid URL or path encoding');
      continue;
    }

    if (pageUrl.origin !== 'https://www.istebul.com') {
      audit.invalidUrls.push(rawLoc + ': unexpected origin ' + pageUrl.origin);
      continue;
    }

    const relative = pathname.replace(/^\/+/, '');
    const candidates = pathname.endsWith('.html')
      ? [path.resolve(base, relative)]
      : [
          path.resolve(base, relative, 'index.html'),
          ...(relative ? [path.resolve(base, relative + '.html')] : [])
        ];

    const htmlFile = candidates.find((candidate) => {
      const insideDist = candidate.startsWith(base + path.sep);
      return insideDist && fs.existsSync(candidate) && fs.statSync(candidate).isFile();
    });

    if (!htmlFile) {
      audit.missingHtml.push(rawLoc);
      continue;
    }

    audit.mapped += 1;
    const html = fs.readFileSync(htmlFile, 'utf8');
    const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

    const blocked = metaTags.some((tag) => {
      const name = getAttribute(tag, 'name');
      const content = getAttribute(tag, 'content');
      return /^(robots|googlebot|bingbot)$/i.test(name) &&
        /\b(?:noindex|none)\b/i.test(content);
    });

    if (blocked) audit.noindex.push(rawLoc);

    const linkTags = html.match(/<link\b[^>]*>/gi) || [];
    const canonicals = linkTags.filter((tag) =>
      getAttribute(tag, 'rel').toLowerCase().split(/\s+/).includes('canonical')
    );

    let canonicalValid = false;

    if (canonicals.length === 0) {
      audit.canonicalIssues.push(rawLoc + ': missing canonical');
    } else if (canonicals.length > 1) {
      audit.canonicalIssues.push(rawLoc + ': duplicate canonical tags');
    } else {
      const href = getAttribute(canonicals[0], 'href');

      if (!href) {
        audit.canonicalIssues.push(rawLoc + ': canonical href missing');
      } else {
        try {
          const actual = new URL(href.replace(/&amp;/g, '&'), pageUrl).href;
          if (actual !== pageUrl.href) {
            audit.canonicalIssues.push(rawLoc + ': canonical mismatch -> ' + actual);
          } else {
            canonicalValid = true;
          }
        } catch {
          audit.canonicalIssues.push(rawLoc + ': invalid canonical URL');
        }
      }
    }

    if (!blocked && canonicalValid) audit.indexable.push(rawLoc);
  }

  return audit;
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
    '/offline',
    '/docs/investor/export',
    '/docs/previews',
    '/docs/site-owner'
  ];

  const sitemapSet = new Set(sitemapLocs);
  const htmlFiles = [...new Set(distFiles.filter((file) => file.endsWith('.html')))];
  let orphans = 0;

  for (const file of htmlFiles) {
    const absoluteFile = path.isAbsolute(file) ? file : path.join(dist, file);
    const rel = path.relative(dist, absoluteFile).split(path.sep).join('/');
    let loc;

    if (rel === 'index.html') {
      loc = 'https://www.istebul.com/';
    } else if (rel.endsWith('/index.html')) {
      const dir = rel.replace(/\/index\.html$/, '');
      loc = `https://www.istebul.com/${dir}/`;
    } else if (rel.endsWith('.html')) {
      loc = `https://www.istebul.com/${rel}`;
    } else {
      continue;
    }

    const pathOnly = loc.replace('https://www.istebul.com', '');
    if (EXCLUDED_PREFIXES.some((prefix) => pathOnly.startsWith(prefix))) continue;

    const html = fs.readFileSync(absoluteFile, 'utf8');
    const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
    const explicitlyNoindex = metaTags.some((tag) => {
      const name = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1] || '';
      if (!/^(robots|googlebot|bingbot)$/i.test(name)) return false;
      const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] || '';
      return /\bnoindex\b/i.test(content);
    });

    if (explicitlyNoindex) continue;

    if (!sitemapSet.has(loc) && !sitemapSet.has(loc.replace(/\/$/, ''))) {
      orphans += 1;
    }
  }

  return orphans;
}
function assertPlatformAiIndexabilityContract() {
  const indexPath = path.join(root, 'index.html');
  const aiPath = path.join(root, 'ai/index.html');
  const indexHtml = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
  const aiHtml = fs.existsSync(aiPath) ? fs.readFileSync(aiPath, 'utf8') : '';
  const failures = collectPlatformAiSurfaceFailures(indexHtml, aiHtml);
  const { xml: sitemapXml } = resolveSitemapArtifact(root);
  failures.push(...collectSitemapContractFailures(sitemapXml));
  return failures;
}

function main() {
  const contractFailures = assertPlatformAiIndexabilityContract();
  if (contractFailures.length) {
    contractFailures.forEach((msg) => console.error('FAIL:', msg));
    process.exit(1);
  }

  const landing = loadJson('data/seo/landing-pages.json');
  const guideStats = landing.pages.map((p) => {
    const merged = mergeGuidePage(p);
    const words = estimatePageWords(merged);
    return { slug: p.slug, words, meetsTarget: words >= TARGET_GUIDE_WORDS };
  });

  const distHtml = walkHtml(dist);
  const rootHtml = walkHtml(root).filter((f) => !f.includes(`${path.sep}dist${path.sep}`) && !f.includes('/admin'));
  const noindexPages = countNoindex([...rootHtml, ...distHtml]);
  const { xml: sitemapXml } = resolveSitemapArtifact(root);
  const sitemapLocs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim().replace(/&amp;/g, '&'));
  const sitemapCount = sitemapLocs.length;
  const indexabilityAudit = auditSitemapIndexability(sitemapLocs, dist);
  const canonIssues = indexabilityAudit.canonicalIssues;
  const schema = schemaValidation(distHtml.length ? distHtml : rootHtml);
  const rehberLinks = internalLinkCount(
    (distHtml.length ? distHtml : rootHtml).filter((f) => f.includes(`${path.sep}index.html`))
  );

  const indexableSitemapCandidates = indexabilityAudit.available
    ? indexabilityAudit.indexable.length
    : null;

  const body = `# SEO Indexability Report

**Generated:** ${SEO_BUILD_DATE}
**Build artifact:** \`dist/\` ${distHtml.length ? 'present' : 'not found — run npm run build'}

## Summary

| Metric | Value |
|--------|-------|
| noindex pages (repo scan) | ${noindexPages.length} |
| sitemap URL count | ${sitemapCount} |
| sitemap URLs with generated HTML | ${indexabilityAudit.available ? indexabilityAudit.mapped + '/' + sitemapCount : 'not evaluated (dist missing)'} |
| sitemap URLs missing generated HTML | ${indexabilityAudit.available ? indexabilityAudit.missingHtml.length : 'not evaluated'} |
| sitemap URLs blocked by noindex | ${indexabilityAudit.available ? indexabilityAudit.noindex.length : 'not evaluated'} |
| invalid sitemap URLs | ${indexabilityAudit.available ? indexabilityAudit.invalidUrls.length : 'not evaluated'} |
| canonical issues (all sitemap URLs) | ${indexabilityAudit.available ? canonIssues.length : 'not evaluated (dist missing)'} |
| indexable orphan HTML (vs sitemap) | ${indexabilityAudit.available ? orphanEstimate(sitemapLocs, distHtml) : 'not evaluated (dist missing)'} |
| internal /rehber/ links (sample) | ${rehberLinks} |
| FAQ schema pages (scan) | ${schema.faqPages} |
| Rehber BreadcrumbList pages | ${schema.breadcrumbGuides} |
| Invalid JSON-LD blocks | ${schema.invalidJson} |
| Indexable sitemap HTML candidates | ${indexabilityAudit.available ? indexableSitemapCandidates : 'not evaluated (dist missing)'} |

## noindex pages

${noindexPages.length ? noindexPages.map((p) => `- \`${p}\``).join('\n') : '_None on public marketing paths (expected: admin-panel, partner onboarding)._'}

## Guide word counts (build-time merge)

| Slug | Words | ≥${TARGET_GUIDE_WORDS} target |
|------|-------|-------------------------------|
${guideStats.map((g) => `| ${g.slug} | ${g.words} | ${g.meetsTarget ? 'yes' : 'no'} |`).join('\n')}

## Canonical issues

${!indexabilityAudit.available ? '_Not evaluated: run npm run build._' : (canonIssues.length ? canonIssues.map((item) => '- ' + item).join('\n') : '_None detected across sitemap URLs._')}

## Schema validation

- FAQPage occurrences: ${schema.faqPages}
- BreadcrumbList on /rehber/: ${schema.breadcrumbGuides}
- JSON-LD parse errors: ${schema.invalidJson}

## Required sitemap paths

${['/', '/ai/', '/auto/', '/konut/', '/tatil/', '/finans/', '/metodoloji/', '/karar-asistani/']
  .map((p) => {
    const loc = `https://www.istebul.com${p === '/' ? '/' : p}`;
    return `- ${loc}: ${sitemapXml.includes(loc) ? 'OK' : 'MISSING'}`;
  })
  .join('\n')}

## EPIC-002 surface contract

| Surface | Contract | Status |
|---------|----------|--------|
| \`/\` (\`index.html\`) | \`#platform-landing\`, \`#neden-istebul\` — no AI long-scroll sections | OK |
| \`/ai/\` (\`ai/index.html\`) | \`#hero-v4-title\`, \`#how-it-works\`, \`#pricing\`, \`#landing-faq\` | OK |

## Notes

- Sitemap HTML candidates are technically eligible URLs, not a count of pages actually indexed by Google. Verify actual indexing status in Search Console.

- Rehber pages are generated at build into \`dist/rehber/{slug}/\`.
- Legacy URLs \`/index.php/*\`, \`/cgi-sys/*\`, \`/2025/*\` → 410; \`/category/*\` → 301 home.
- After Platform Cutover, AI homepage sections are indexability-checked on \`/ai/\` only.
`;

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, body);
  console.log('seo-indexability-report: OK (Platform + AI contracts)');
  console.log('seo-indexability-report: wrote', reportPath);
  console.log(body.split('\n').slice(0, 20).join('\n'));
}

main();
