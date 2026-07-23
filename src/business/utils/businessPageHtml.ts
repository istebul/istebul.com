/**
 * Shared HTML shell factory for Business MVP pages.
 * Used only while authoring; each route has a committed index.html.
 */
export function businessPageHtml(options: {
  title: string;
  description: string;
  canonicalPath: string;
  pageId: string;
  robots?: string;
}): string {
  const robots = options.robots ?? 'index, follow, max-image-preview:large';
  const canonical = `https://www.istebul.com${options.canonicalPath}`;
  return `<!doctype html>
<html lang="tr" data-business-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${options.title} | İSTEBUL Business</title>
  <meta name="description" content="${options.description}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${canonical}">
  <meta name="theme-color" content="#2563eb">
  <meta name="color-scheme" content="light dark">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/svg+xml" href="/assets/brand/istebul-icon.svg">
  <link rel="apple-touch-icon" sizes="192x192" href="/assets/icons/favicon-192.png">
  <meta property="og:locale" content="tr_TR">
  <meta property="og:site_name" content="isteBul">
  <meta property="og:title" content="${options.title} | İSTEBUL Business">
  <meta property="og:description" content="${options.description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://www.istebul.com/assets/images/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${options.title} | İSTEBUL Business">
  <meta name="twitter:description" content="${options.description}">
  <link rel="stylesheet" href="/css/ib-brand-logo-v1.css">
  <link rel="stylesheet" href="/css/business-page.css">
  <script src="/env.js" defer></script>
  <script type="module" src="/js/business/business-app.js"></script>
</head>
<body class="ib-business-app">
  <div id="business-app-root" data-business-page="${options.pageId}"></div>
  <noscript>
    <main class="ib-biz-noscript">
      <h1>${options.title}</h1>
      <p>${options.description}</p>
      <p>Bu uygulama için JavaScript gerekir.</p>
    </main>
  </noscript>
</body>
</html>
`;
}
