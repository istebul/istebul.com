import test from 'node:test';
import assert from 'node:assert/strict';
import {
  injectSpaShellDocumentMeta,
  patchSpaShellHtml
} from '../../scripts/lib/spa-shell-meta.cjs';

const sampleHtml = `<!DOCTYPE html><html lang="tr" class="ib-route-pending ib-ds-v4"><head>
<title>isteBul | AI ile Büyük Satın Alma Kararları</title>
<meta name="description" id="meta-description" content="home desc">
<meta property="og:title" id="meta-og-title" content="home og">
<meta property="og:description" id="meta-og-description" content="home og desc">
<meta property="og:url" id="meta-og-url" content="https://www.istebul.com/">
<meta name="twitter:title" id="meta-twitter-title" content="home tw">
<meta name="twitter:description" id="meta-twitter-description" content="home tw desc">
<link rel="canonical" id="meta-canonical" href="https://www.istebul.com/">
</head><body></body></html>`;

test('injectSpaShellDocumentMeta sets route surface and document meta', () => {
  const out = injectSpaShellDocumentMeta(sampleHtml, {
    routeSurface: 'profil',
    meta: {
      title: 'Hesabım | isteBul',
      description: 'Profil, abonelik ve hesap ayarlarınızı yönetin.',
      path: '/profil'
    },
    siteOrigin: 'https://www.istebul.com'
  });

  assert.match(out, /data-ib-route="profil"/);
  assert.doesNotMatch(out, /ib-route-pending/);
  assert.match(out, /<title>Hesabım \| isteBul<\/title>/);
  assert.match(out, /id="meta-canonical" href="https:\/\/www\.istebul\.com\/profil"/);
  assert.match(out, /id="meta-description" content="Profil, abonelik ve hesap ayarlarınızı yönetin\."/);
});

test('injectSpaShellDocumentMeta does not rewrite route selectors inside inline CSS', () => {
  const htmlWithRouteCss = `<!DOCTYPE html><html lang="tr" class="ib-route-pending ib-ds-v4"><head>
<style>
html.ib-route-pending [data-private-section]{display:none!important}
html[data-ib-route="home"] #home{display:block!important}
html[data-ib-route^="page-"] #home{display:none!important}
</style>
<title>isteBul</title>
<meta name="description" id="meta-description" content="home desc">
<meta property="og:title" id="meta-og-title" content="home og">
<meta property="og:description" id="meta-og-description" content="home og desc">
<meta property="og:url" id="meta-og-url" content="https://www.istebul.com/">
<meta name="twitter:title" id="meta-twitter-title" content="home tw">
<meta name="twitter:description" id="meta-twitter-description" content="home tw desc">
<link rel="canonical" id="meta-canonical" href="https://www.istebul.com/">
</head><body></body></html>`;

  const out = patchSpaShellHtml(htmlWithRouteCss, 'blog', {
    siteOrigin: 'https://www.istebul.com',
    surfaces: {
      'page-blog': {
        title: 'Blog | isteBul',
        description: 'Blog',
        path: '/blog'
      }
    }
  });

  assert.match(out, /<html[^>]*data-ib-route="page-blog"/);
  assert.match(out, /html\[data-ib-route="home"\] #home\{display:block!important\}/);
  assert.doesNotMatch(out, /html\[data-ib-route="page-blog"\] #home\{display:block!important\}/);
  assert.match(out, /html\.ib-route-pending \[data-private-section\]/);
});

test('patchSpaShellHtml maps folder names to route surfaces', () => {
  const routeMeta = {
    siteOrigin: 'https://www.istebul.com',
    surfaces: {
      history: {
        title: 'Karar Geçmişi | isteBul',
        description: 'Geçmiş karar analizlerinizi görüntüleyin.',
        path: '/gecmis'
      }
    }
  };

  const out = patchSpaShellHtml(sampleHtml, 'gecmis', routeMeta);
  assert.match(out, /data-ib-route="history"/);
  assert.match(out, /<title>Karar Geçmişi \| isteBul<\/title>/);
});
