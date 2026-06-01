'use strict';

const fs = require('fs');
const path = require('path');
const { mergeGuidePage, estimatePageWords, MIN_GUIDE_WORDS } = require('./seo-guide-expansions.cjs');
const {
  renderSiteSocialFooterNav,
  renderSiteSocialBootScripts
} = require('./site-social-footer.cjs');

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
  return p.replace(/^\/(en|de|ar|it|fr|es|ja|zh)(?=\/|$)/, '') || '/';
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
  <link rel="stylesheet" href="/css/istebul-design-system-v4.css?v=7">
  <link rel="stylesheet" href="/css/istebul-premium-final-v7.css?v=7">
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

function articleSchema(base, { title, description, path, dateModified }) {
  return {
    '@type': 'Article',
    headline: title,
    description,
    inLanguage: 'tr-TR',
    datePublished: '2026-01-15',
    dateModified: dateModified || SEO_BUILD_DATE,
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

let guideStandardV1 = null;

function loadGuideStandardV1() {
  if (!guideStandardV1) {
    try {
      guideStandardV1 = loadJson('data/seo/guide-standard-v1.json');
    } catch {
      guideStandardV1 = {};
    }
  }
  return guideStandardV1;
}

function slugFromGuidePath(path = '') {
  const m = String(path).match(/\/rehber\/([^/]+)\//);
  return m ? m[1] : '';
}

function renderGuideStandardBlocks(slug) {
  const blocks = loadGuideStandardV1()[slug];
  if (!blocks) return '';

  const parts = [
    { title: 'Kimler için uygun?', body: blocks.whoFor },
    { title: 'Karar verirken bakılması gerekenler', body: blocks.decisionFactors },
    { title: 'Toplam maliyet etkisi', body: blocks.costImpact },
    { title: 'Riskler', body: blocks.risks },
    { title: 'isteBul nasıl yardımcı olur?', body: blocks.howIstebulHelps }
  ];

  return `<div class="seo-guide-standard" aria-label="Karar rehberi özeti">
    ${parts
      .map(
        (p) => `<section class="seo-section seo-guide-standard__block">
      <h2>${escapeHtml(p.title)}</h2>
      <p>${escapeHtml(p.body)}</p>
    </section>`
      )
      .join('\n')}
    <p class="seo-guide-standard__note">${escapeHtml(
      'Bu içerik bilgilendirme ve karar destek amaçlıdır; bağlayıcı finansal, hukuki veya yatırım tavsiyesi değildir. Nihai teklif ve sözleşme koşullarını yetkili kurumlardan doğrulayın.'
    )}</p>
  </div>`;
}

function renderGuideCta(cta, usePremium) {
  if (usePremium) return renderPremiumGuideCta();
  if (!cta) return '';
  const secondary =
    cta.secondary ?
      `<a class="seo-cta-btn seo-cta-btn--secondary" href="${escapeHtml(cta.secondary.href)}">${escapeHtml(cta.secondary.label)}</a>`
    : '';
  return `<div class="seo-cta">
        <div class="seo-cta-row-inner">
          <a class="seo-cta-btn" href="${escapeHtml(cta.href)}">${escapeHtml(cta.label)}</a>
          ${secondary}
        </div>
        <p class="seo-cta-note">Ücretsiz · KVKK uyumlu · Skorlar kural motorundan gelir</p>
      </div>`;
}

function sectionAnchor(heading, index) {
  const base = String(heading || '')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `bolum-${index + 1}`;
}

function formatDateTr(isoDate) {
  const [y, m, d] = String(isoDate).split('-');
  const months = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık'
  ];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

function estimateReadingMinutes(page) {
  const words = estimatePageWords(page);
  return Math.max(5, Math.ceil(words / 200));
}

const GUIDE_INTERNAL_LINKS = {
  'suv-mi-sedan-mi': [
    { href: '/auto/', label: 'Araç karar analizi' },
    { href: '/finans/', label: 'Finansman analizi' },
    { href: '/metodoloji/', label: 'Metodoloji ve skor şeffaflığı' },
    { href: '/#landing-faq', label: 'Sık sorulan sorular (SSS)' }
  ],
  'elektrikli-arac-rehberi': [
    { href: '/auto/', label: 'Araç karar analizi' },
    { href: '/finans/', label: 'Finansman analizi' },
    { href: '/metodoloji/', label: 'Metodoloji' },
    { href: '/#landing-faq', label: 'SSS' }
  ],
  'finansman-rehberi': [
    { href: '/finans/', label: 'Finansman analizi' },
    { href: '/auto/', label: 'Araç karar analizi' },
    { href: '/metodoloji/', label: 'Metodoloji' },
    { href: '/#landing-faq', label: 'SSS' }
  ],
  'tco-rehberi': [
    { href: '/auto/', label: 'Araç TCO analizi' },
    { href: '/finans/', label: 'Finansman analizi' },
    { href: '/metodoloji/', label: 'Metodoloji' },
    { href: '/#landing-faq', label: 'SSS' }
  ],
  'ikinci-el-rehberi': [
    { href: '/auto/', label: 'Araç karar analizi' },
    { href: '/finans/', label: 'Finansman analizi' },
    { href: '/metodoloji/', label: 'Metodoloji' },
    { href: '/#landing-faq', label: 'SSS' }
  ]
};

function renderSocialShare(canonicalPath) {
  const url = encodeURIComponent(absoluteUrl('https://www.istebul.com', canonicalPath));
  return `<div class="seo-share" aria-label="Paylaş">
    <span>Paylaş:</span>
    <a href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" rel="noopener noreferrer" target="_blank">LinkedIn</a>
    <a href="https://twitter.com/intent/tweet?url=${url}" rel="noopener noreferrer" target="_blank">X</a>
    <a href="https://wa.me/?text=${url}" rel="noopener noreferrer" target="_blank">WhatsApp</a>
  </div>`;
}

function renderArticleMeta(page, canonicalPath) {
  const minutes = estimateReadingMinutes(page);
  return `<div class="seo-article-meta">
    <span class="seo-reading-time">${minutes} dk okuma</span>
    <time datetime="${SEO_BUILD_DATE}">Güncellendi: ${formatDateTr(SEO_BUILD_DATE)}</time>
    ${renderSocialShare(canonicalPath)}
  </div>`;
}

function renderSummaryBox(page) {
  return `<aside class="seo-summary-box" aria-label="Özet">
    <strong>Bu rehberde</strong>
    <p>${escapeHtml(page.intro)}</p>
  </aside>`;
}

function renderStickyToc(sections) {
  const items = (sections || [])
    .slice(0, 14)
    .map((s, index) => {
      const id = sectionAnchor(s.heading, index);
      return `<li><a href="#${escapeHtml(id)}">${escapeHtml(s.heading)}</a></li>`;
    })
    .join('');
  if (!items) return '';
  return `<nav class="seo-toc" aria-label="İçindekiler">
    <strong class="seo-toc__title">İçindekiler</strong>
    <ol>${items}</ol>
  </nav>`;
}

function renderExpertTips(tips) {
  if (!tips?.length) return '';
  return `<section class="seo-section seo-expert-tips">
    <h2>Uzman önerileri</h2>
    <ul>${tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
  </section>`;
}

function renderCommonMistakes(mistakes) {
  if (!mistakes?.length) return '';
  return `<section class="seo-section seo-mistakes">
    <h2>Sık yapılan hatalar</h2>
    <ul>${mistakes.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
  </section>`;
}

function renderInternalLinks(slug) {
  const links = GUIDE_INTERNAL_LINKS[slug];
  if (!links?.length) return '';
  return `<section class="seo-section seo-internal-links">
    <h2>İlgili sayfalar</h2>
    <ul>${links.map((l) => `<li><a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a></li>`).join('')}</ul>
  </section>`;
}

function renderPremiumGuideCta() {
  return `<section class="seo-cta seo-cta--premium" aria-labelledby="seo-premium-cta-title">
    <h2 id="seo-premium-cta-title">Kararınızı veriyle destekleyin</h2>
    <p>isteBul yapay zekâ destekli karar analizi ile maliyet, risk ve uygunluk değerlendirmesini birkaç dakika içinde oluşturun.</p>
    <div class="seo-cta-row-inner">
      <a class="seo-cta-btn" href="/auto/">Ücretsiz Analize Başla</a>
    </div>
    <p class="seo-cta-note">Ücretsiz · KVKK uyumlu · Bilgilendirme amaçlı — finansal tavsiye değildir</p>
  </section>`;
}

function renderSections(sections) {
  return (sections || [])
    .map((s, index) => {
      const id = sectionAnchor(s.heading, index);
      const subs = (s.subsections || [])
        .map(
          (sub) => `<h3>${escapeHtml(sub.heading)}</h3>
        <p>${escapeHtml(sub.body)}</p>`
        )
        .join('\n');
      return `<section class="seo-section" id="${escapeHtml(id)}">
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
        ${renderSiteSocialFooterNav()}
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
          <li><a href="/yardim.html">Yardım merkezi</a></li>
          <li><a href="/gizlilik.html">Gizlilik</a></li>
          <li><a href="/kvkk.html">Ziyaretçi Aydınlatma Metni</a></li>
          <li><a href="/kvkk.html#kvkk-bilgilendirme">KVKK hakkında bilgilendirme</a></li>
        </ul>
      </div>
    </div>
    <p class="seo-copy">&copy; ${new Date().getFullYear()} ${escapeHtml(site.siteName)}. Tüm hakları saklıdır.</p>
  </footer>`;
}

const GUIDE_CTAS = {
  'finansman-rehberi': { href: '/finans/', label: 'Finansman analizini başlat' },
  'tco-rehberi': {
    href: '/auto/',
    label: 'Araç TCO analizini başlat',
    secondary: { href: '/finans/', label: 'Finansman analizini başlat' }
  },
  'suv-mi-sedan-mi': { href: '/auto/', label: 'Araç analizini başlat' },
  'elektrikli-arac-rehberi': { href: '/auto/', label: 'Araç analizini başlat' },
  'ikinci-el-rehberi': { href: '/auto/', label: 'Araç analizini başlat' }
};

function renderContactCards() {
  return `<section class="seo-section seo-contact-grid" aria-label="İletişim kanalları">
    <div class="seo-contact-card">
      <h2>Destek ve satış</h2>
      <p><a href="mailto:info@istebul.com">info@istebul.com</a></p>
      <p class="seo-contact-note">Ürün, hesap ve analiz soruları</p>
    </div>
    <div class="seo-contact-card">
      <h2>Partner başvurusu</h2>
      <p><a href="/partner-olun.html">Partner olun sayfası</a></p>
      <p class="seo-contact-note">Galeri, finans ve sigorta iş birlikleri</p>
    </div>
    <div class="seo-contact-card">
      <h2>Kurumsal teklif</h2>
      <p><a href="mailto:info@istebul.com?subject=Kurumsal%20Teklif">Kurumsal teklif talebi</a></p>
      <p class="seo-contact-note">Lisans ve entegrasyon talepleri</p>
    </div>
    <div class="seo-contact-card">
      <h2>KVKK başvurusu</h2>
      <p><a href="mailto:info@istebul.com?subject=KVKK%20Başvurusu">KVKK başvurusu gönder</a></p>
      <p class="seo-contact-note">Yanıt süresi en geç 30 gün</p>
    </div>
  </section>`;
}

function renderHelpFaqSection() {
  let articles = [];
  try {
    const knowledge = loadJson('data/customer/faq-knowledge.json');
    articles = knowledge.articles || [];
  } catch {
    articles = [];
  }

  const faqItems = articles
    .map(
      (item) => `<details class="seo-help-faq">
        <summary>${escapeHtml(item.question)}</summary>
        <p>${escapeHtml(item.answer)}</p>
        ${
          item.action?.href
            ? `<p><a href="${escapeHtml(item.action.href)}">${escapeHtml(item.action.label || 'Devam et')} →</a></p>`
            : ''
        }
      </details>`
    )
    .join('\n');

  return `<section class="seo-section seo-faq seo-help-faq-list" aria-labelledby="help-faq-title">
    <h2 id="help-faq-title">Sık sorulan sorular</h2>
    <p class="seo-help-note">Site içi «Yardım» düğmesi aynı SSS içeriğini sunar. Sorunuz çözülmezse <a href="/iletisim.html">iletişim</a> veya WhatsApp destek hattını kullanın.</p>
    ${faqItems}
  </section>`;
}

function renderContentPage({ site, page, path, breadcrumbs, relatedLinks, cta, kicker, extraHtml }) {
  const base = site.baseUrl;
  const jsonLd = [
    breadcrumbSchema(base, breadcrumbs),
    articleSchema(base, {
      title: page.title,
      description: page.description,
      path,
      dateModified: SEO_BUILD_DATE
    })
  ];
  const faq = faqSchema(page.faqs);
  if (faq) jsonLd.push(faq);

  const guideSlug = slugFromGuidePath(path);
  const standardBlocks = renderGuideStandardBlocks(guideSlug);
  const sections = `${standardBlocks}${renderSections(page.sections)}`;
  const comparisonHtml = renderComparisonTable(page.comparisonTable);
  const prosConsHtml = renderProsCons(page.advantages, page.disadvantages);
  const expertTipsHtml = renderExpertTips(page.expertTips);
  const mistakesHtml = renderCommonMistakes(page.commonMistakes);
  const conclusionHtml = page.conclusion
    ? `<section class="seo-section seo-conclusion" id="sonuc"><h2>Sonuç</h2><p>${escapeHtml(page.conclusion)}</p></section>`
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
        <h2>Sonraki rehber önerileri</h2>
        <ul>${relatedLinks.map((l) => `<li><a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a></li>`).join('')}</ul>
      </section>`
    : '';

  const internalLinksHtml = renderInternalLinks(guideSlug);
  const tocHtml = page.isFooterGuide ? renderStickyToc(page.sections) : '';
  const usePremiumCta = Boolean(page.isFooterGuide);

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
<html lang="tr" class="ib-ds-v4 ib-premium-v7">
<head>
  ${renderHead({ site, title: page.title, description: page.description, canonicalPath: path, jsonLdExtra: jsonLd })}
</head>
<body class="seo-page${page.isFooterGuide ? ' seo-page--guide-v2' : ''}">
  ${renderSeoNav()}
  <main class="seo-main">
    <nav class="seo-breadcrumb" aria-label="Breadcrumb">${crumbs}</nav>
    <div class="seo-article-layout">
      ${tocHtml ? `<aside class="seo-toc-sidebar">${tocHtml}</aside>` : ''}
      <article class="seo-article-body">
      <p class="seo-kicker">${escapeHtml(kicker || 'Türkiye · Karar rehberi')}</p>
      <h1>${escapeHtml(page.h1)}</h1>
      ${page.isFooterGuide ? renderArticleMeta(page, path) : ''}
      ${page.isFooterGuide ? '' : `<p class="seo-lead">${escapeHtml(page.intro)}</p>`}
      ${page.isFooterGuide ? renderSummaryBox(page) : ''}
      ${bullets ? `<ul class="seo-bullets">${bullets}</ul>` : ''}
      ${extraHtml || ''}
      ${sections}
      ${comparisonHtml}
      ${prosConsHtml}
      ${mistakesHtml}
      ${expertTipsHtml}
      ${conclusionHtml}
      ${faqHtml}
      ${internalLinksHtml}
      ${related}
      ${renderGuideCta(loadGuideStandardV1()[guideSlug]?.cta || cta, usePremiumCta)}
      </article>
    </div>
  </main>
  ${renderSeoFooter({ site, guideLinks: relatedLinks })}
  ${renderSiteSocialBootScripts()}
</body>
</html>`;
}

function buildCorporateRichPages(distDir, site) {
  const pages = [
    {
      filename: 'hakkimizda.html',
      jsonPath: 'data/seo/about-page.json',
      path: '/hakkimizda.html',
      kicker: 'Kurumsal · Hakkımızda',
      breadcrumbs: [
        { name: 'Ana sayfa', path: '/' },
        { name: 'Hakkımızda', path: '/hakkimizda.html' }
      ],
      relatedLinks: [
        { href: '/metodoloji/', label: 'Metodoloji' },
        { href: '/rehber/tco-rehberi/', label: 'TCO rehberi' },
        { href: '/auto/', label: 'Ücretsiz analiz' }
      ],
      cta: { href: '/auto/', label: 'Ücretsiz analiz başlat' }
    },
    {
      filename: 'iletisim.html',
      jsonPath: 'data/seo/contact-page.json',
      path: '/iletisim.html',
      kicker: 'Kurumsal · İletişim',
      breadcrumbs: [
        { name: 'Ana sayfa', path: '/' },
        { name: 'İletişim', path: '/iletisim.html' }
      ],
      relatedLinks: [
        { href: '/partner-olun.html', label: 'Partner olun' },
        { href: '/hakkimizda.html', label: 'Hakkımızda' },
        { href: '/kvkk.html', label: 'KVKK' }
      ],
      cta: { href: '/auto/', label: 'Ücretsiz analiz başlat' },
      extraHtml: renderContactCards()
    },
    {
      filename: 'yardim.html',
      jsonPath: 'data/seo/help-page.json',
      path: '/yardim.html',
      kicker: 'Destek · Yardım merkezi',
      breadcrumbs: [
        { name: 'Ana sayfa', path: '/' },
        { name: 'Yardım', path: '/yardim.html' }
      ],
      relatedLinks: [
        { href: '/iletisim.html', label: 'İletişim' },
        { href: '/kvkk.html', label: 'KVKK' },
        { href: '/planlar', label: 'Planlar' },
        { href: '/auto/', label: 'Ücretsiz analiz' }
      ],
      cta: { href: '/auto/', label: 'Analize başla' },
      extraHtml: renderHelpFaqSection()
    }
  ];

  pages.forEach((cfg) => {
    const page = loadJson(cfg.jsonPath);
    const html = renderContentPage({
      site,
      page,
      path: cfg.path,
      breadcrumbs: cfg.breadcrumbs,
      relatedLinks: cfg.relatedLinks,
      cta: cfg.cta,
      kicker: cfg.kicker,
      extraHtml: cfg.extraHtml
    });
    fs.writeFileSync(path.join(distDir, cfg.filename), html);
    fs.writeFileSync(path.join(root, cfg.filename), html);
  });
}

function buildRehberHubIndex(distDir, site, landingConfig) {
  const prefix = landingConfig.prefix || '/rehber/';
  const links = landingConfig.pages.map((p) => ({
    href: `${prefix}${p.slug}/`,
    label: p.h1,
    desc: p.description
  }));

  const hubListHtml = `<section class="seo-section" aria-labelledby="rehber-hub-list-title">
    <h2 id="rehber-hub-list-title">Tüm rehberler</h2>
    <ul class="seo-hub-list">
      ${links
        .map(
          (l) => `<li>
        <a href="${escapeHtml(l.href)}"><strong>${escapeHtml(l.label)}</strong></a>
        <p>${escapeHtml(l.desc)}</p>
      </li>`
        )
        .join('')}
    </ul>
  </section>`;

  const page = {
    title: 'Araç Alım Rehberleri | TCO, Finansman, SUV | isteBul',
    description:
      'Türkiye odaklı araç alım rehberleri: TCO, finansman, SUV vs sedan, elektrikli araç, ikinci el kontrol listesi ve karşılaştırma.',
    h1: 'Karar rehberleri',
    intro:
      'Satın alma öncesi okumanız gereken uzman rehberler. Her sayfa toplam maliyet, risk ve kullanım profiline göre yapılandırılmıştır.',
    sections: [],
    faqs: [
      {
        q: 'Rehberler ücretsiz mi?',
        a: 'Evet, tüm rehber içerikleri ücretsiz okunabilir. Analiz aracı ayrıca ücretsiz başlatılabilir.'
      }
    ],
    conclusion: 'Rehber okuduktan sonra ücretsiz Auto analizi ile kendi profilinize özel skor ve TCO özeti alın.'
  };

  const html = renderContentPage({
    site,
    page,
    path: prefix,
    breadcrumbs: [
      { name: 'Ana sayfa', path: '/' },
      { name: 'Rehber', path: prefix }
    ],
    relatedLinks: links.slice(0, 5),
    cta: { href: '/auto/', label: 'Ücretsiz analiz başlat' },
    kicker: 'Kaynaklar · Rehber merkezi',
    extraHtml: hubListHtml
  });

  const outDir = path.join(distDir, 'rehber');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}

function injectCorporateMeta(distDir) {
  const metaMap = loadJson('data/seo/corporate-meta.json');
  const site = loadJson('data/seo/site.json');

  const skipFullBuild = new Set(['hakkimizda.html', 'iletisim.html', 'yardim.html']);

  Object.entries(metaMap).forEach(([filename, meta]) => {
    if (skipFullBuild.has(filename)) return;
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
      <a href="/rehber/tco-rehberi/">TCO rehberi</a>
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
    const guideCta = GUIDE_CTAS[page.slug] || { href: '/auto/', label: 'Ücretsiz karar analizine başla' };
    const html = renderContentPage({
      site,
      page,
      path: pagePath,
      breadcrumbs,
      relatedLinks,
      cta: guideCta
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

  buildRehberHubIndex(distDir, site, landingConfig);
  buildCorporateRichPages(distDir, site);
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
    { href: '/rehber/tco-rehberi/', label: 'TCO rehberi' },
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
  const localePrefixes = ['', '/en', '/de', '/ar', '/it', '/fr', '/es', '/ja', '/zh'];
  const localizedPaths = new Set(['/', '/auto/', '/metodoloji/', '/konut/', '/tatil/', '/finans/', '/planlar', '/hakkimizda.html', '/iletisim.html']);

  hubsConfig.hubs.forEach((h) => {
    urls.push({ loc: h.path, priority: '0.85', changefreq: 'weekly' });
  });

  const prefix = landingConfig.prefix || '/rehber/';
  landingConfig.pages.forEach((p) => {
    const isFooterGuide = [
      'suv-mi-sedan-mi',
      'elektrikli-arac-rehberi',
      'finansman-rehberi',
      'tco-rehberi',
      'ikinci-el-rehberi'
    ].includes(p.slug);
    urls.push({
      loc: `${prefix}${p.slug}/`,
      priority: isFooterGuide ? '0.65' : '0.7',
      changefreq: 'monthly'
    });
  });

  const seen = new Set();
  const expandedUrls = [];

  urls.forEach((entry) => {
    expandedUrls.push(entry);
    if (!localizedPaths.has(entry.loc)) return;
    localePrefixes.forEach((prefix) => {
      if (!prefix) return;
      const localizedLoc = entry.loc === '/' ? `${prefix}/` : `${prefix}${entry.loc}`;
      expandedUrls.push({ ...entry, loc: localizedLoc });
    });
  });

  const body = expandedUrls
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
Disallow: /admin/
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
