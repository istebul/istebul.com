'use strict';

const { escapeHtml, absoluteUrl } = require('./seo.cjs');
const {
  renderSiteSocialFooterNav,
  renderSiteSocialBootScripts
} = require('./site-social-footer.cjs');

function renderCorporateNav(activePath) {
  const items = [
    { href: '/', label: 'Ana sayfa' },
    { href: '/auto/', label: 'Auto', key: 'auto' },
    { href: '/konut/', label: 'Konut', key: 'konut' },
    { href: '/tatil/', label: 'Tatil', key: 'tatil' },
    { href: '/finans/', label: 'Finans', key: 'finans' },
    { href: '/metodoloji/', label: 'Metodoloji', key: 'metodoloji' },
    { href: '/hakkimizda.html', label: 'Hakkımızda', key: 'hakkimizda' },
    { href: '/partner-olun.html', label: 'Partner', key: 'partner' }
  ];
  const links = items
    .map((item) => {
      const isActive =
        activePath === item.href ||
        (item.key && activePath && activePath.includes(`/${item.key}`));
      const cls = isActive ? ' class="is-active"' : '';
      return `<a href="${escapeHtml(item.href)}"${cls}>${escapeHtml(item.label)}</a>`;
    })
    .join('\n      ');
  return `<header class="auto-header corporate-header">
    <a class="logo" href="/">isteBul</a>
    <nav class="corporate-nav" aria-label="Ana navigasyon">
      ${links}
    </nav>
  </header>`;
}

function renderCorporateFooter() {
  return `<footer class="corporate-footer">
    <div>
      <strong>isteBul</strong>
      <p>Karar zekâsı platformu — ilan sitesi değil, karar motoru.</p>
      ${renderSiteSocialFooterNav()}
    </div>
    <nav>
      <a href="/hakkimizda.html">Hakkımızda</a>
      <a href="/metodoloji/">Metodoloji</a>
      <a href="/iletisim.html">İletişim</a>
      <a href="/gizlilik.html">Gizlilik</a>
      <a href="/kvkk.html">KVKK</a>
      <a href="/partner-olun.html">Partner olun</a>
    </nav>
  </footer>`;
}

function renderHeadBlock({ site, title, description, canonicalPath, jsonLd }) {
  const canonical = absoluteUrl(site.baseUrl, canonicalPath);
  const ogImage = absoluteUrl(site.baseUrl, site.defaultOgImage);
  const ld = jsonLd
    ? `\n  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
    : '';
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${escapeHtml(canonical)}">
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
  <link rel="stylesheet" href="/css/auto.css?v=4">
  <link rel="stylesheet" href="/css/corporate-pages.css?v=1">${ld}`;
}

function renderAboutPage(site, page, controller) {
  const pillars = (page.pillars || [])
    .map(
      (p) =>
        `<article><span>${escapeHtml(p.n)}</span><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.text)}</p></article>`
    )
    .join('\n      ');
  const c = controller.controller;

  return `<!doctype html>
<html lang="tr">
<head>
  ${renderHeadBlock({
    site,
    title: page.title,
    description: page.description,
    canonicalPath: page.canonicalPath
  })}
</head>
<body>
  ${renderCorporateNav(page.canonicalPath)}
  <main class="section legal-page corporate-page">
    <p class="kicker">${escapeHtml(page.kicker)}</p>
    <h1>${escapeHtml(page.h1)}</h1>
    <p class="lead">${escapeHtml(page.lead)}</p>

    <section class="corporate-vm" aria-labelledby="vision-title">
      <h2 id="vision-title">${escapeHtml(page.visionTitle)}</h2>
      <p>${escapeHtml(page.vision)}</p>
    </section>
    <section class="corporate-vm" aria-labelledby="mission-title">
      <h2 id="mission-title">${escapeHtml(page.missionTitle)}</h2>
      <p>${escapeHtml(page.mission)}</p>
    </section>

    <div class="grid three premium-steps">
      ${pillars}
    </div>

    <p class="corporate-note text-muted-sm">Veri sorumlusu: ${escapeHtml(c.contactPerson)} · <a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a> · <a href="/kvkk.html">KVKK aydınlatma</a></p>
  </main>
  ${renderCorporateFooter()}
  ${renderSiteSocialBootScripts()}
</body>
</html>`;
}

function renderMethodologyPage(site, page) {
  const sections = (page.sections || [])
    .map(
      (s) =>
        `<section class="auto-methodology premium-methodology"><div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.text)}</p></div></section>`
    )
    .join('\n    ');
  const principles = (page.principles || [])
    .map((p) => `<li>${escapeHtml(p)}</li>`)
    .join('\n      ');

  return `<!doctype html>
<html lang="tr">
<head>
  ${renderHeadBlock({
    site,
    title: page.title,
    description: page.description,
    canonicalPath: page.path,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.h1,
      description: page.description,
      author: { '@type': 'Organization', name: site.siteName },
      publisher: { '@type': 'Organization', name: site.siteName, url: site.baseUrl },
      inLanguage: 'tr-TR'
    }
  })}
</head>
<body>
  ${renderCorporateNav(page.path)}
  <main class="section legal-page corporate-page">
    <p class="kicker">${escapeHtml(page.kicker)}</p>
    <h1>${escapeHtml(page.h1)}</h1>
    <p class="lead">${escapeHtml(page.lead)}</p>
    ${sections}
    <section class="auto-methodology premium-methodology">
      <div><h3>İlkeler</h3></div>
      <ul>${principles}</ul>
    </section>
    <div class="actions corporate-actions">
      <a class="btn primary" href="${escapeHtml(page.ctaPrimary.href)}">${escapeHtml(page.ctaPrimary.label)}</a>
      <a class="btn secondary" href="${escapeHtml(page.ctaSecondary.href)}">${escapeHtml(page.ctaSecondary.label)}</a>
    </div>
    <p class="corporate-disclaimer">Analiz ve skorlar bilgilendirme amaçlıdır; finansal tavsiye veya getiri taahhüdü değildir.</p>
  </main>
  ${renderCorporateFooter()}
  ${renderSiteSocialBootScripts()}
</body>
</html>`;
}

function renderVerticalPage(site, vertical, controllerEmail) {
  const path = `/${vertical.slug}/`;
  const steps = (vertical.steps || [])
    .map(
      (s) =>
        `<article><span>${escapeHtml(s.n)}</span><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.text)}</p></article>`
    )
    .join('\n      ');
  const contactHref = `/iletisim.html?dikey=${encodeURIComponent(vertical.slug)}`;
  const mailSubject = encodeURIComponent(`Erken erişim — ${vertical.productName}`);

  return `<!doctype html>
<html lang="tr">
<head>
  ${renderHeadBlock({
    site,
    title: vertical.title,
    description: vertical.description,
    canonicalPath: path,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: vertical.productName,
      url: absoluteUrl(site.baseUrl, path),
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: vertical.description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'TRY' },
      inLanguage: 'tr-TR'
    }
  })}
</head>
<body class="corporate-vertical">
  ${renderCorporateNav(path)}
  <main class="section corporate-page">
    <p class="kicker">${escapeHtml(vertical.kicker)}</p>
    <h1>${escapeHtml(vertical.h1)}</h1>
    <p class="lead">${escapeHtml(vertical.lead)}</p>
    <p class="corporate-pilot-badge">Pilot aşama · skor kural tabanlı · AI yalnızca gerekçe · finansal tavsiye değildir</p>

    <section class="corporate-vm" aria-labelledby="${vertical.slug}-vision">
      <h2 id="${vertical.slug}-vision">Vizyon</h2>
      <p>${escapeHtml(vertical.vision)}</p>
    </section>
    <section class="corporate-vm" aria-labelledby="${vertical.slug}-mission">
      <h2 id="${vertical.slug}-mission">Misyon</h2>
      <p>${escapeHtml(vertical.mission)}</p>
    </section>

    <div class="grid three premium-steps">
      ${steps}
    </div>

    <div class="actions corporate-actions">
      <a class="btn primary" href="${escapeHtml(contactHref)}">Erken erişim talebi</a>
      <a class="btn secondary" href="mailto:${escapeHtml(controllerEmail)}?subject=${mailSubject}">E-posta ile başvur</a>
      <a class="btn secondary" href="/auto/">Canlı Auto analizine git</a>
    </div>
    <p class="corporate-disclaimer">Bu dikey henüz pilot hazırlığındadır. Tam analiz akışı için şimdilik <a href="/auto/">isteBul Auto</a> kullanılabilir.</p>
  </main>
  ${renderCorporateFooter()}
  ${renderSiteSocialBootScripts()}
</body>
</html>`;
}

function renderKvkkPage(site, controller, retention) {
  const c = controller.controller;
  const schedules = (retention.schedules || [])
    .slice(0, 8)
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.data_category)}</td><td>${row.retention_days != null ? `${row.retention_days} gün` : 'Hesaba / yasal yükümlülüğe bağlı'}</td><td>${escapeHtml(row.action)}</td></tr>`
    )
    .join('\n          ');

  return `<!doctype html>
<html lang="tr">
<head>
  ${renderHeadBlock({
    site,
    title: 'KVKK Aydınlatma Metni | isteBul',
    description: '6698 sayılı KVKK kapsamında isteBul veri sorumlusu bilgileri, saklama süreleri ve başvuru hakları.',
    canonicalPath: '/kvkk.html'
  })}
</head>
<body>
  ${renderCorporateNav('/kvkk.html')}
  <main class="section legal-page corporate-page">
    <p class="kicker">KVKK</p>
    <h1>Kişisel Verilerin Korunması Aydınlatma Metni</h1>
    <p class="lead">6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) kapsamında, veri sorumlusu sıfatıyla kişisel verilerinizin işlenmesine ilişkin bilgilendirme metnidir.</p>

    <section class="auto-methodology premium-methodology">
      <div><h3>Veri sorumlusu</h3></div>
      <ul>
        <li><strong>Ticari unvan / marka:</strong> ${escapeHtml(c.tradeName)}</li>
        <li><strong>İletişim:</strong> ${escapeHtml(c.contactPerson)}</li>
        <li><strong>E-posta:</strong> <a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a></li>
        <li><strong>Telefon:</strong> ${escapeHtml(c.phone)}</li>
        <li><strong>Adres:</strong> ${escapeHtml(c.address)}</li>
        <li><strong>Web:</strong> <a href="${escapeHtml(c.web)}">${escapeHtml(c.web)}</a></li>
      </ul>
    </section>

    <section class="auto-methodology premium-methodology">
      <div><h3>İşlenen veri kategorileri ve amaçlar</h3></div>
      <ul>
        <li>Kimlik ve iletişim (ad, e-posta, telefon) — hesap, destek ve lead süreçleri</li>
        <li>Karar profili (bütçe, tercih, finansman) — TCO ve uyum skoru hesaplama</li>
        <li>İşlem güvenliği (IP, oturum, Turnstile) — kötüye kullanım önleme</li>
        <li>Ödeme (Stripe müşteri kimliği) — abonelik; kart bilgisi sunucularımızda tutulmaz</li>
        <li>Analitik (onay sonrası) — ürün iyileştirme</li>
        <li>Partner yönlendirme — açık rızanız ile skorlu lead paylaşımı</li>
      </ul>
    </section>

    <section class="auto-methodology premium-methodology">
      <div><h3>Hukuki sebep</h3></div>
      <p>KVKK m.5/2 kapsamında sözleşmenin kurulması ve ifası, hukuki yükümlülük, meşru menfaat; açık rıza gerektiren hallerde (pazarlama, bazı çerezler, partner paylaşımı) ayrı onay alınır.</p>
    </section>

    <section class="auto-methodology premium-methodology">
      <div><h3>Yurt dışı aktarım ve alt işleyenler</h3></div>
      <p>Altyapı sağlayıcıları (Supabase, Cloudflare, Stripe, LLM API) nedeniyle veriler yurt dışında işlenebilir. Güncel liste: docs/investor/SUBPROCESSORS.md. Sözleşmesel güvenlik önlemleri hedeflenir.</p>
    </section>

    <section class="auto-methodology premium-methodology">
      <div><h3>Saklama süreleri (özet)</h3></div>
      <table class="corporate-table">
        <thead><tr><th>Kategori</th><th>Süre</th><th>İşlem</th></tr></thead>
        <tbody>
          ${schedules}
        </tbody>
      </table>
      <p class="text-muted-sm">Detay: data/compliance/retention-schedule.json — operasyonel hedef; nihai süreler hukuk onayı ile güncellenir.</p>
    </section>

    <section class="auto-methodology premium-methodology">
      <div><h3>İlgili kişi hakları ve başvuru</h3></div>
      <p>KVKK m.11 kapsamında erişim, düzeltme, silme, işlemeyi kısıtlama, itiraz ve zararın giderilmesi taleplerinizi iletebilirsiniz.</p>
      <ul>
        <li><strong>Başvuru:</strong> <a href="mailto:${escapeHtml(c.email)}?subject=${encodeURIComponent(controller.kvkk.applicationSubject)}">${escapeHtml(c.email)}</a> — konu: <strong>${escapeHtml(controller.kvkk.applicationSubject)}</strong></li>
        <li><strong>Form:</strong> <a href="/iletisim.html">İletişim</a> sayfası</li>
        <li><strong>Yanıt süresi:</strong> En geç ${controller.kvkk.responseDays} gün (KVKK m.13)</li>
        <li><strong>Şikâyet:</strong> ${escapeHtml(controller.kvkk.authority)}</li>
      </ul>
    </section>
  </main>
  ${renderCorporateFooter()}
  ${renderSiteSocialBootScripts()}
</body>
</html>`;
}

module.exports = {
  renderAboutPage,
  renderMethodologyPage,
  renderVerticalPage,
  renderKvkkPage
};
