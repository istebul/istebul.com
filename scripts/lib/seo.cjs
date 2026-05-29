'use strict';

const fs = require('fs');
const path = require('path');
const { mergeGuidePage, estimatePageWords, MIN_GUIDE_WORDS } = require('./seo-guide-expansions.cjs');

const root = path.resolve(__dirname, '../..');
const SEO_BUILD_DATE = new Date().toISOString().slice(0, 10);

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function loadSeoLocales() {
  try {
    return loadJson('data/seo/locales.json');
  } catch {
    return null;
  }
}

function stripLocalePrefixPath(pathname = '/') {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return p.replace(/^\/(en|de|ar)(?=\/|$)/, '') || '/';
}

function renderHreflangAlternates(site, canonicalPath) {
  const locales = loadSeoLocales();
  if (!locales?.alternates) return '';

  const base = site.baseUrl.replace(/\/$/, '');
  const bare = stripLocalePrefixPath(canonicalPath);
  const tags = [];

  for (const [id, alt] of Object.entries(locales.alternates)) {
    const prefix = alt.pathPrefix || '';
    const localized = prefix ? `${prefix}${bare === '/' ? '/' : bare}` : bare;
    const href = absoluteUrl(base, localized);
    tags.push(`<link rel="alternate" hreflang="${escapeHtml(alt.hreflang || id)}" href="${escapeHtml(href)}">`);
  }

  tags.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(absoluteUrl(base, bare))}">`);

  return tags.join('\n  ');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absoluteUrl(baseUrl, pathname) {
  const base = baseUrl.replace(/\/$/, '');
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${p}`;
}

function renderHead({ site, title, description, canonicalPath, jsonLdExtra }) {
  const base = site.baseUrl;
  const canonical = absoluteUrl(base, canonicalPath);
  const ogImage = absoluteUrl(base, site.defaultOgImage);
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${base}/#organization`,
      name: site.organization.name,
      url: `${base}/`,
      logo: site.organization.logo
    },
    {
      '@type': 'WebSite',
      '@id': `${base}/#website`,
      url: `${base}/`,
      name: site.siteName,
      publisher: { '@id': `${base}/#organization` },
      inLanguage: site.language
    }
  ];
  if (jsonLdExtra) {
    graph.push(...(Array.isArray(jsonLdExtra) ? jsonLdExtra : [jsonLdExtra]));
  }

  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="googlebot" content="index, follow">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  ${renderHreflangAlternates(site, canonicalPath)}
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
  <meta property="og:locale" content="${escapeHtml(site.locale)}">
  <meta property="og:site_name" content="${escapeHtml(site.siteName)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <link rel="stylesheet" href="/css/seo-landing.css">
  <link rel="stylesheet" href="/css/istebul-design-system-v4.css?v=2">
  <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

function breadcrumbSchema(base, items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(base, item.path)
    }))
  };
}

function faqSchema(faqs) {
  if (!faqs || !faqs.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

function articleSchema(base, { title, description, path }) {
  return {
    '@type': 'Article',
    headline: title,
    description,
    inLanguage: 'tr-TR',
    author: { '@id': `${base}/#organization` },
    publisher: { '@id': `${base}/#organization` },
    mainEntityOfPage: absoluteUrl(base, path)
  };
}

function resolveRelatedLinks(page, landingBySlug, hubsBySlug) {
  const links = [];
  (page.related || []).forEach((slug) => {
    if (landingBySlug[slug]) {
      const p = landingBySlug[slug];
      links.push({ href: `${p.prefix || '/rehber/'}${slug}/`, label: p.h1 });
    } else if (hubsBySlug[slug]) {
      const h = hubsBySlug[slug];
      links.push({ href: h.path, label: h.h1 });
    }
  });
  return links;
}

function renderSeoNav() {
  return `<header class="seo-header">
    <a class="seo-logo" href="/">isteBul</a>
    <nav class="seo-nav" aria-label="Ana navigasyon">
      <a href="/auto/">Karar Analizi</a>
      <a href="/karar-asistani/">Karar Asistanı</a>
      <a href="/rehber/arac-alim-karar-asistani/">Rehber</a>
      <a href="/partner-olun.html">Partner</a>
    </nav>
  </header>`;
}

function renderComparisonTable(table) {
  if (!table?.headers?.length) return '';
  const caption = table.caption ? `<caption>${escapeHtml(table.caption)}</caption>` : '';
  const head = table.headers.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('');
  const body = (table.rows || [])
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');
  return `<section class="seo-section seo-compare">
    <h2>Karşılaştırma tablosu</h2>
    <div class="seo-table-wrap">
      <table class="seo-table">${caption}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    </div>
  </section>`;
}

function renderProsCons(advantages, disadvantages) {
  if (!advantages?.length && !disadvantages?.length) return '';
  const pros = (advantages || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const cons = (disadvantages || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<section class="seo-section seo-pros-cons">
    <div class="seo-pros-cons-grid">
      ${pros ? `<div><h2>Avantajlar</h2><ul>${pros}</ul></div>` : ''}
      ${cons ? `<div><h2>Dezavantajlar</h2><ul>${cons}</ul></div>` : ''}
    </div>
  </section>`;
}

function renderSections(sections) {
  return (sections || [])
    .map((s) => {
      const subs = (s.subsections || [])
        .map(
          (sub) => `<h3>${escapeHtml(sub.heading)}</h3>
        <p>${escapeHtml(sub.body)}</p>`
        )
        .join('\n');
      return `<section class="seo-section">
        <h2>${escapeHtml(s.heading)}</h2>
        <p>${escapeHtml(s.body)}</p>
        ${subs}
      </section>`;
    })
    .join('\n');
}

function renderSeoFooter({ site, guideLinks }) {
  const guides = (guideLinks || []).slice(0, 8)
    .map((l) => `<li><a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a></li>`)
    .join('\n          ');
  return `<footer class="seo-footer">
    <div class="seo-footer-grid">
      <div>
        <strong>${escapeHtml(site.siteName)}</strong>
        <p>Türkiye odaklı araç alım karar destek platformu — TCO, kredi ve karşılaştırma.</p>
      </div>
      <div>
        <h2>Platform</h2>
        <ul>
          <li><a href="/">Ana sayfa</a></li>
          <li><a href="/auto/">Ücretsiz analiz</a></li>
          <li><a href="/ilanlar/">İlanlar</a></li>
          <li><a href="/karsilastir/">Karşılaştır</a></li>
        </ul>
      </div>
      <div>
        <h2>Rehber</h2>
        <ul>
          ${guides}
        </ul>
      </div>
      <div>
        <h2>Kurumsal</h2>
        <ul>
          <li><a href="/hakkimizda.html">Hakkımızda</a></li>
          <li><a href="/iletisim.html">İletişim</a></li>
          <li><a href="/gizlilik.html">Gizlilik</a></li>
          <li><a href="/kvkk.html">KVKK</a></li>
        </ul>
      </div>
    </div>
    <p class="seo-copy">&copy; ${new Date().getFullYear()} ${escapeHtml(site.siteName)}. Tüm hakları saklıdır.</p>
  </footer>`;
}

function renderContentPage({ site, page, path, breadcrumbs, relatedLinks, cta }) {
  const base = site.baseUrl;
  const jsonLd = [
    breadcrumbSchema(base, breadcrumbs),
    articleSchema(base, { title: page.title, description: page.description, path })
  ];
  const faq = faqSchema(page.faqs);
  if (faq) jsonLd.push(faq);

  const sections = renderSections(page.sections);
  const comparisonHtml = renderComparisonTable(page.comparisonTable);
  const prosConsHtml = renderProsCons(page.advantages, page.disadvantages);
  const conclusionHtml = page.conclusion
    ? `<section class="seo-section seo-conclusion"><h2>Sonuç</h2><p>${escapeHtml(page.conclusion)}</p></section>`
    : '';

  const faqHtml = (page.faqs || []).length
    ? `<section class="seo-section seo-faq">
        <h2>Sık sorulan sorular</h2>
        ${page.faqs
          .map((f) => `<details><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`)
          .join('\n')}
      </section>`
    : '';

  const related = relatedLinks.length
    ? `<section class="seo-section seo-related">
        <h2>İlgili rehberler</h2>
        <ul>${relatedLinks.map((l) => `<li><a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a></li>`).join('')}</ul>
      </section>`
    : '';

  const crumbs = breadcrumbs
    .map((b, i) => {
      if (i === breadcrumbs.length - 1) return `<span aria-current="page">${escapeHtml(b.name)}</span>`;
      return `<a href="${escapeHtml(b.path)}">${escapeHtml(b.name)}</a>`;
    })
    .join(' <span aria-hidden="true">/</span> ');

  const bullets = (page.bullets || [])
    .map((b) => `<li>${escapeHtml(b)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="tr" class="ib-ds-v4">
<head>
  ${renderHead({ site, title: page.title, description: page.description, canonicalPath: path, jsonLdExtra: jsonLd })}
</head>
<body class="seo-page">
  ${renderSeoNav()}
  <main class="seo-main">
    <nav class="seo-breadcrumb" aria-label="Breadcrumb">${crumbs}</nav>
    <article>
      <p class="seo-kicker">Türkiye · Araç alım rehberi</p>
      <h1>${escapeHtml(page.h1)}</h1>
      <p class="seo-lead">${escapeHtml(page.intro)}</p>
      ${bullets ? `<ul class="seo-bullets">${bullets}</ul>` : ''}
      ${sections}
      ${comparisonHtml}
      ${prosConsHtml}
      ${conclusionHtml}
      ${faqHtml}
      ${related}
      <div class="seo-cta">
        <a class="seo-cta-btn" href="${escapeHtml(cta.href)}">${escapeHtml(cta.label)}</a>
        <p class="seo-cta-note">Ücretsiz · KVKK uyumlu · Birkaç dakikada sonuç</p>
      </div>
    </article>
  </main>
  ${renderSeoFooter({ site, guideLinks: relatedLinks })}
</body>
</html>`;
}

function injectCorporateMeta(distDir) {
  const metaMap = loadJson('data/seo/corporate-meta.json');
  const site = loadJson('data/seo/site.json');

  Object.entries(metaMap).forEach(([filename, meta]) => {
    const filePath = path.join(distDir, filename);
    if (!fs.existsSync(filePath)) return;

    let html = fs.readFileSync(filePath, 'utf8');
    const canonical = absoluteUrl(site.baseUrl, `/${filename}`);
    const ogImage = absoluteUrl(site.baseUrl, site.defaultOgImage);

    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
    if (html.includes('name="description"')) {
      html = html.replace(
        /<meta name="description" content="[^"]*">/,
        `<meta name="description" content="${escapeHtml(meta.description)}">`
      );
    } else {
      html = html.replace('</head>', `  <meta name="description" content="${escapeHtml(meta.description)}">\n</head>`);
    }

    if (!html.includes('rel="canonical"')) {
      html = html.replace(
        '</head>',
        `  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
</head>`
      );
    }

    if (!html.includes('seo-footer-links')) {
      html = html.replace(
        '</footer>',
        `<nav class="seo-footer-links" aria-label="SEO rehber">
      <a href="/rehber/arac-kredisi-hesaplama/">Kredi rehberi</a>
      <a href="/rehber/arac-toplam-sahiplik-maliyeti/">TCO</a>
      <a href="/auto/">Karar analizi</a>
    </nav>
  </footer>`
      );
    }

    fs.writeFileSync(filePath, html);
  });
}

function buildSeoPages(distDir) {
  const site = loadJson('data/seo/site.json');
  const landingConfig = loadJson('data/seo/landing-pages.json');
  const hubsConfig = loadJson('data/seo/hubs.json');

  const landingBySlug = {};
  landingConfig.pages.forEach((p) => {
    landingBySlug[p.slug] = { ...p, prefix: landingConfig.prefix };
  });

  const hubsBySlug = {};
  hubsConfig.hubs.forEach((h) => {
    hubsBySlug[h.slug] = h;
  });

  const prefix = landingConfig.prefix || '/rehber/';
  const topGuides = landingConfig.pages.slice(0, 8).map((p) => ({
    href: `${prefix}${p.slug}/`,
    label: p.h1
  }));

  const wordCounts = {};
  landingConfig.pages.forEach((rawPage) => {
    const page = mergeGuidePage(rawPage);
    const words = estimatePageWords(page);
    wordCounts[page.slug] = words;
    if (words < MIN_GUIDE_WORDS) {
      console.warn(`SEO guide ${page.slug}: ${words} words (target ${MIN_GUIDE_WORDS}+)`);
    }

    const pagePath = `${prefix}${page.slug}/`;
    const breadcrumbs = [
      { name: 'Ana sayfa', path: '/' },
      { name: 'Rehber', path: prefix },
      { name: page.h1, path: pagePath }
    ];
    const relatedLinks = resolveRelatedLinks(page, landingBySlug, hubsBySlug);
    const html = renderContentPage({
      site,
      page,
      path: pagePath,
      breadcrumbs,
      relatedLinks,
      cta: { href: '/auto/', label: 'Ücretsiz karar analizine başla' }
    });

    const outDir = path.join(distDir, 'rehber', page.slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
  });

  hubsConfig.hubs.forEach((hub) => {
    const page = {
      title: hub.title,
      description: hub.description,
      h1: hub.h1,
      intro: hub.intro,
      bullets: hub.bullets,
      sections: [],
      faqs: [],
      related: hub.relatedLandings || []
    };
    const breadcrumbs = [
      { name: 'Ana sayfa', path: '/' },
      { name: hub.h1, path: hub.path }
    ];
    const relatedLinks = resolveRelatedLinks(page, landingBySlug, hubsBySlug);
    const html = renderContentPage({
      site,
      page,
      path: hub.path,
      breadcrumbs,
      relatedLinks,
      cta: { href: hub.ctaHref || '/auto/', label: hub.ctaLabel || 'Başla' }
    });

    const segments = hub.path.replace(/^\/|\/$/g, '').split('/');
    const outDir = path.join(distDir, ...segments);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
  });

  injectCorporateMeta(distDir);
  buildMethodologyPage(distDir, site);
  return { site, landingConfig, hubsConfig, topGuides, guideWordCounts: wordCounts };
}

function buildMethodologyPage(distDir, site) {
  const page = loadJson('data/seo/methodology-page.json');
  const pathName = '/metodoloji/';
  const breadcrumbs = [
    { name: 'Ana sayfa', path: '/' },
    { name: 'Metodoloji', path: pathName }
  ];
  const relatedLinks = [
    { href: '/auto/', label: 'Auto analiz' },
    { href: '/rehber/arac-toplam-sahiplik-maliyeti/', label: 'TCO rehberi' },
    { href: '/karar-asistani/', label: 'Karar asistanı' }
  ];
  const html = renderContentPage({
    site,
    page: {
      ...page,
      title: page.title,
      description: page.description,
      h1: page.h1,
      intro: page.intro,
      sections: page.sections,
      faqs: page.faqs,
      conclusion: page.conclusion
    },
    path: pathName,
    breadcrumbs,
    relatedLinks,
    cta: { href: '/auto/', label: 'Metodolojiyi dene — Auto analiz' }
  });

  const outDir = path.join(distDir, 'metodoloji');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  fs.writeFileSync(path.join(root, 'metodoloji', 'index.html'), html);
}

function generateSitemap(distDir, { site, landingConfig, hubsConfig }) {
  const urls = [...site.staticUrls];

  hubsConfig.hubs.forEach((h) => {
    urls.push({ loc: h.path, priority: '0.85', changefreq: 'weekly' });
  });

  const prefix = landingConfig.prefix || '/rehber/';
  landingConfig.pages.forEach((p) => {
    urls.push({ loc: `${prefix}${p.slug}/`, priority: '0.75', changefreq: 'monthly' });
  });

  const seen = new Set();
  const body = urls
    .filter((u) => {
      const key = u.loc;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((u) => {
      const loc = absoluteUrl(site.baseUrl, u.loc);
      const priority = u.priority ? `\n    <priority>${u.priority}</priority>` : '';
      const changefreq = u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : '';
      const lastmod = `\n    <lastmod>${u.lastmod || SEO_BUILD_DATE}</lastmod>`;
      return `  <url>
    <loc>${loc}</loc>${lastmod}${priority}${changefreq}
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

  fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml);
}

function generateRobots(distDir, site) {
  const robots = `User-agent: *
Allow: /
Disallow: /admin-panel
Disallow: /admin-panel.html
Disallow: /profil/
Disallow: /favoriler/
Disallow: /gecmis/
Disallow: /messages/
Disallow: /ilan-ekle/

User-agent: GPTBot
Disallow: /

Sitemap: ${absoluteUrl(site.baseUrl, '/sitemap.xml')}
`;
  fs.writeFileSync(path.join(root, 'robots.txt'), robots);
  fs.writeFileSync(path.join(distDir, 'robots.txt'), robots);
}

module.exports = {
  loadJson,
  escapeHtml,
  absoluteUrl,
  buildSeoPages,
  buildMethodologyPage,
  generateSitemap,
  generateRobots,
  SEO_BUILD_DATE
};
