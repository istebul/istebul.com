const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const esbuild = require('esbuild');
const crypto = require('crypto');

const root = process.cwd();
const dist = path.join(root, 'dist');
const staticRoots = ['assets', 'data', 'docs'];
/** Internal-only docs — not copied to public dist (orphan HTML / investor exports). */
const PUBLIC_DOCS_SKIP_PREFIXES = ['docs/investor/export', 'docs/previews', 'docs/site-owner'];
const copyDataSubdir = (subdir) => {
  const src = path.join(root, 'data', subdir);
  const dest = path.join(dist, 'data', subdir);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    fs.copyFileSync(path.join(src, entry.name), path.join(dest, entry.name));
  }
};
const copyGrowthDataDir = () => copyDataSubdir('growth');
const copySalesDataDir = () => copyDataSubdir('sales');
const staticFiles = ['_headers', '_redirects', '_routes.json', 'index.html', 'offline.html', 'manifest.json', 'sw.js', 'robots.txt', 'sitemap.xml', 'ads.txt', 'admin-panel.html', 'importmap.json', 'favicon.ico', 'auto/index.html', 'metodoloji/index.html', 'veri-kaynaklari/index.html', 'konut/index.html', 'tatil/index.html', 'finans/index.html', 'sigorta/index.html', 'kasko/index.html', 'restoran/index.html', 'r/index.html', 'r/onay/index.html', 'garson/index.html', 'ilan-analizi/index.html', 'gizlilik.html', 'kvkk.html', 'gdpr.html', 'kullanim-sartlari.html', 'cerez-politikasi.html', 'partner-olun.html', 'partner-planlar.html', 'partner-guven.html', 'partner-docs.html', 'partner-onboarding.html', 'partner-basvuru.html', 'partner-closing-kit.html', 'karar-moat.html', 'css/seo-landing.css', 'css/istebul-ui-final-v5.css', 'css/istebul-ui-product-cards-v6.css', 'css/istebul-premium-final-v7.css', 'css/home-header-saas-v1.css', 'css/home-product-cards-enterprise-v1.css', 'css/corporate-pages.css', 'css/partner-platform.css', 'css/partner-funnel-form-v1.css', 'css/admin-partner-ops.css',
    'css/admin-internal-dashboards.css',
    'css/admin-ops-ai-assistant.css', 'css/admin-ai-listings.css', 'css/growth-cro.css', 'css/growth-retention.css', 'css/help-center.css', 'css/sales-partner.css', 'admin/ai-listings.html', 'admin/forbidden.html'];
const { buildSeoPages, generateSitemap, generateRobots } = require('./lib/seo.cjs');
const { patchSpaShellHtml, loadRouteMeta } = require('./lib/spa-shell-meta.cjs');
const { injectLocaleShellMeta, loadLocaleIds } = require('./lib/locale-shell-meta.cjs');
const { injectVerticalFaqs } = require('./lib/seo-vertical-faq.cjs');
const { injectRouteBootstrap, writeRouteBootstrapFile } = require('./lib/route-bootstrap.cjs');
const { injectPremiumPrerender } = require('./lib/inject-premium-prerender.cjs');
const { injectHomeCategoryPrerender } = require('./lib/inject-home-category-prerender.cjs');
const { injectPartnerHtmlFiles } = require('./lib/inject-partner-prerender.cjs');

function runInjectHomeCategoryPrerender(html) {
  const os = require('os');
  const tmpIn = path.join(os.tmpdir(), `ib-home-cat-in-${process.pid}-${Date.now()}.html`);
  const tmpOut = path.join(os.tmpdir(), `ib-home-cat-out-${process.pid}-${Date.now()}.html`);
  const injectorPath = path.join(__dirname, 'lib/inject-home-category-prerender.cjs');

  fs.writeFileSync(tmpIn, html, 'utf8');

  const script = `
    const fs = require('fs');
    const { injectHomeCategoryPrerender } = require(${JSON.stringify(injectorPath)});
    injectHomeCategoryPrerender(fs.readFileSync(${JSON.stringify(tmpIn)}, 'utf8'))
      .then((output) => {
        fs.writeFileSync(${JSON.stringify(tmpOut)}, output, 'utf8');
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  `;

  const result = spawnSync(process.execPath, ['-e', script], { stdio: 'inherit' });
  try {
    if (result.status !== 0) {
      throw new Error('injectHomeCategoryPrerender failed during production build');
    }
    return fs.readFileSync(tmpOut, 'utf8');
  } finally {
    for (const filePath of [tmpIn, tmpOut]) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
    }
  }
}
const { buildHashedCssAssets } = require('./lib/css-build.cjs');
const runCssBundles = spawnSync(process.execPath, [path.join(root, 'scripts/generate-css-bundles.cjs')], {
  cwd: root,
  stdio: 'inherit'
});
if (runCssBundles.status !== 0) process.exit(runCssBundles.status || 1);
const runOpsEmbed = spawnSync(process.execPath, [path.join(root, 'scripts/generate-admin-ops-embed.cjs')], {
  cwd: root,
  stdio: 'inherit'
});
if (runOpsEmbed.status !== 0) process.exit(runOpsEmbed.status || 1);

const runCheck = spawnSync(process.execPath, [path.join(root, 'scripts/check-syntax.cjs')], {
  cwd: root,
  stdio: 'inherit'
});
if (runCheck.status !== 0) process.exit(runCheck.status || 1);

writeRouteBootstrapFile();

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const ensureDir = (filePath) => fs.mkdirSync(path.dirname(filePath), { recursive: true });
const writeFile = (relativePath, content) => {
  const target = path.join(dist, relativePath);
  ensureDir(target);
  fs.writeFileSync(target, content);
};
const copyFile = (relativePath) => {
  const target = path.join(dist, relativePath);
  ensureDir(target);
  fs.copyFileSync(path.join(root, relativePath), target);
};
const shouldSkipEntry = (name) => name.startsWith('.') || name === 'Thumbs.db';
const copyDir = (relativePath) => {
  const normalized = relativePath.split(path.sep).join('/');
  if (PUBLIC_DOCS_SKIP_PREFIXES.some((skip) => normalized === skip || normalized.startsWith(`${skip}/`))) {
    return;
  }
  const sourceDir = path.join(root, relativePath);
  const targetDir = path.join(dist, relativePath);
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (shouldSkipEntry(entry.name)) continue;

    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(path.relative(root, source).split(path.sep).join('/'));
    } else if (entry.isFile()) {
      ensureDir(target);
      fs.copyFileSync(source, target);
    }
  }
};
const walk = (dir, callback) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (shouldSkipEntry(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, callback);
    } else if (entry.isFile()) {
      callback(fullPath);
    }
  }
};
const relative = (filePath) => path.relative(root, filePath).split(path.sep).join('/');
const assetRefs = new Map();
const hashContent = (content) => crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
const bundleExternals = ['lucide'];
const withHashName = (relativePath, hash) => {
  const parsed = path.parse(relativePath);
  return path.join(parsed.dir, `${parsed.name}.${hash}${parsed.ext}`).split(path.sep).join('/');
};
const rewriteAssetRefs = (html) => {
  let output = html;
  for (const [originalPath, hashedPath] of assetRefs.entries()) {
    const escaped = originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(`(["'])/?${escaped}(?:\\?v=\\d+)?`, 'g'), `$1/${hashedPath}`);
  }
  return output;
};

const FONT_ASYNC_MARK = '<!-- perf:async-fonts -->';
const FONT_ASYNC_SNIPPET = `${FONT_ASYNC_MARK}
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/css/perf-fonts.css" media="print" data-perf-fonts-async>
<noscript><link rel="stylesheet" href="/css/perf-fonts.css"></noscript>
<script src="/js/runtime/perf-fonts-async.js" defer></script>`;

const injectAsyncFonts = (html) => {
  // After rewriteAssetRefs, href is perf-fonts.<hash>.css — not literal perf-fonts.css
  if (html.includes(FONT_ASYNC_MARK) || html.includes('data-perf-fonts-async') || html.includes('perf-fonts')) {
    return html;
  }
  if (!html.includes('ib-ds-v4') && !html.includes('vertical-decision.bundle')) {
    return html;
  }
  return html.replace(/<head([^>]*)>/i, `<head$1>\n  ${FONT_ASYNC_SNIPPET}`);
};

const injectPerformanceHints = (html, appBundleFile) => {
  let output = html;

  output = output.replace(
    '<!-- perf:importmap -->',
    ''
  );

  const styleHashed = assetRefs.get('css/style.css');
  const homeBundleHashed = assetRefs.get('css/bundles/homepage.bundle.css');
  const preloadBlocks = [];
  if (styleHashed) {
    preloadBlocks.push(`<link rel="preload" href="/${styleHashed}" as="style">`);
  }
  if (homeBundleHashed) {
    preloadBlocks.push(`<link rel="preload" href="/${homeBundleHashed}" as="style">`);
  }
  output = output.replace(
    '<!-- perf:preload-style -->',
    preloadBlocks[0] || ''
  );
  output = output.replace(
    '<!-- perf:preload-homepage-bundle -->',
    preloadBlocks[1] || ''
  );

  if (appBundleFile) {
    output = output.replace(
      '<!-- perf:modulepreload -->',
      `<link rel="modulepreload" href="/js/${appBundleFile}" crossorigin>`
    );
  } else {
    output = output.replace('<!-- perf:modulepreload -->', '');
  }

  return output;
};

const minifyHtml = (source) =>
  source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/a>\s*<a\b/gi, '</a> <a')
    .replace(/>\s+</g, '><')
    .trim();

staticRoots.forEach(copyDir);
copyGrowthDataDir();
copySalesDataDir();

const lucideUmd = path.join(root, 'node_modules/lucide/dist/umd/lucide.min.js');
if (!fs.existsSync(lucideUmd)) {
  throw new Error('Missing lucide UMD — run npm install');
}
writeFile('assets/lucide.min.js', fs.readFileSync(lucideUmd));

const {
  buildPublicEnv,
  isStrictPublicEnvBuild,
  withCiBuildPublicEnvFallback,
  assertPublicEnvForBuild,
  assertProductionAnonKeyNotPlaceholder,
  formatEnvJs
} = require('./lib/public-env.cjs');

const publicEnv = withCiBuildPublicEnvFallback(buildPublicEnv(process.env, root), process.env);
assertPublicEnvForBuild(publicEnv, { strict: isStrictPublicEnvBuild() });
assertProductionAnonKeyNotPlaceholder(publicEnv, process.env);

writeFile('env.js', formatEnvJs(publicEnv));

const pendingStaticFiles = [];
staticFiles.forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.html')) {
    pendingStaticFiles.push({ file, source });
  } else if (file.endsWith('.js')) {
    writeFile(file, esbuild.transformSync(source, { loader: 'js', minify: true, target: 'es2020' }).code);
  } else {
    copyFile(file);
  }
});

const decisionCategoryCardCssSrc = 'js/features/decision-cards/decision-category-card.css';
const decisionCategoryCardCssEntry = 'css/decision-category-card.css';
if (fs.existsSync(path.join(root, decisionCategoryCardCssSrc))) {
  fs.mkdirSync(path.join(root, 'css'), { recursive: true });
  fs.copyFileSync(
    path.join(root, decisionCategoryCardCssSrc),
    path.join(root, decisionCategoryCardCssEntry)
  );
}

buildHashedCssAssets({
  root,
  assetRefs,
  writeFile,
  relative,
  withHashName,
  hashContent,
  walk
});

esbuild.buildSync({
  entryPoints: [path.join(root, 'js/app.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  sourcemap: false,
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  entryNames: 'app.bundle-[hash]',
  external: bundleExternals,
  outdir: path.join(dist, 'js')
});

const appBundleFile = fs.readdirSync(path.join(dist, 'js')).find((name) => /^app\.bundle-[A-Z0-9]+\.js$/.test(name));
if (!appBundleFile) {
  throw new Error('App bundle file was not generated.');
}

pendingStaticFiles.forEach(({ file, source }) => {
  let html = injectAsyncFonts(rewriteAssetRefs(source));
  if (file === 'index.html') {
    html = injectRouteBootstrap(html);
    const bootstrapHash = hashContent(
      fs.readFileSync(path.join(root, 'js/runtime/route-bootstrap-head.js'), 'utf8')
    );
    html = html.replace(
      '/js/runtime/route-bootstrap-head.js',
      `/js/runtime/route-bootstrap-head.js?v=${bootstrapHash}`
    );
    html = injectPremiumPrerender(html);
    html = runInjectHomeCategoryPrerender(html);
    html = html.replace(/js\/app\.bundle(?:-[A-Z0-9]+)?\.js(?:\?v=\d+)?/g, '/js/' + appBundleFile);
    html = injectPerformanceHints(html, appBundleFile);
  }

  writeFile(file, minifyHtml(html));

  if (file === 'admin-panel.html') {
    writeFile('admin/index.html', minifyHtml(html));
  }
});

esbuild.buildSync({
  entryPoints: [path.join(root, 'js/admin-panel.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  sourcemap: false,
  outfile: path.join(dist, 'js/admin-panel.js')
});

const partnerCorporateEntries = [
  'js/corporate/partner.js',
  'js/corporate/partner-planlar.js',
  'js/corporate/partner-basvuru.js',
  'js/corporate/partner-guven.js',
  'js/corporate/partner-docs.js',
  'js/corporate/partner-onboarding.js',
  'js/corporate/partner-onboarding-redirect.js',
  'js/corporate/partner-closing-kit.js',
  'js/corporate/karar-moat.js'
];

partnerCorporateEntries.forEach((entry) => {
  const outfile = path.join(dist, entry);
  ensureDir(outfile);
  esbuild.buildSync({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    sourcemap: false,
    outfile
  });
});

const decisionV3Out = path.join(dist, 'js/decision/ai-decision-engine-v3.js');
ensureDir(decisionV3Out);
esbuild.buildSync({
  entryPoints: [path.join(root, 'js/decision/ai-decision-engine-v3.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  sourcemap: false,
  outfile: decisionV3Out
});

const verticalLocaleShellOut = path.join(dist, 'js/runtime/vertical-locale-shell.js');
ensureDir(verticalLocaleShellOut);
esbuild.buildSync({
  entryPoints: [path.join(root, 'js/runtime/vertical-locale-shell.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  sourcemap: false,
  outfile: verticalLocaleShellOut
});

const siteAnalyticsBootOut = path.join(dist, 'js/runtime/site-analytics-boot.js');
ensureDir(siteAnalyticsBootOut);
esbuild.buildSync({
  entryPoints: [path.join(root, 'js/runtime/site-analytics-boot.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  sourcemap: false,
  outfile: siteAnalyticsBootOut
});

const siteSocialInitOut = path.join(dist, 'js/runtime/site-social-init.js');
ensureDir(siteSocialInitOut);
esbuild.buildSync({
  entryPoints: [path.join(root, 'js/runtime/site-social-init.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  sourcemap: false,
  outfile: siteSocialInitOut
});

const emitRuntimeScript = (relativePath) => {
  const src = path.join(root, relativePath);
  if (!fs.existsSync(src)) return;
  writeFile(
    relativePath,
    esbuild.transformSync(fs.readFileSync(src, 'utf8'), {
      loader: 'js',
      minify: true,
      target: 'es2020'
    }).code
  );
};

[
  'js/runtime/static-cookie-consent.js',
  'js/runtime/perf-fonts-async.js',
  'js/runtime/site-social-deferred-boot.js',
  'js/runtime/category-guides-deferred-boot.js',
  'js/decision/decision-v3-mount.js'
].forEach(emitRuntimeScript);

const routeBootstrapOut = path.join(dist, 'js/runtime/route-bootstrap-head.js');
writeRouteBootstrapFile(routeBootstrapOut);

const autoDocumentReadySrc = path.join(root, 'js/auto/auto-document-ready.js');
if (fs.existsSync(autoDocumentReadySrc)) {
  const autoReadyCode = esbuild.transformSync(fs.readFileSync(autoDocumentReadySrc, 'utf8'), {
    loader: 'js',
    minify: true,
    target: 'es2020'
  }).code;
  writeFile('js/auto/auto-document-ready.js', autoReadyCode);
}

const autoAssetDir = path.join(dist, 'assets', 'auto-runtime');
fs.mkdirSync(autoAssetDir, { recursive: true });

const autoCssParts = [
  'css/auto.css',
  'css/auto-premium-design-system.css',
  'css/p4-premium-product.css',
  'css/p4-3-mobile-premium.css',
  'css/conversion-micro-ux.css',
  'css/p4-5-perceived-performance.css',
  'css/p4-6-brand-consistency.css',
  'css/award-polish.css',
  'css/auto-mobile-results.css',
  'css/auto-results-ux.css',
  'css/auto-decision-engine-ui.css',
  'css/auto-hero-dashboard-v1.css',
  'css/auto-shell-unified-v1.css',
  'css/auto-question-ux.css',
  'css/enterprise-card-readability.css',
  'css/auto-final-cta-contrast-v1.css',
  'css/istebul-design-system-v4.css',
  'css/istebul-ds-v4-polish.css'
];
const autoCssCombined = autoCssParts
  .filter((rel) => fs.existsSync(path.join(root, rel)))
  .map((rel) => fs.readFileSync(path.join(root, rel), 'utf8'))
  .join('\n');
let autoCssFile = null;
if (autoCssCombined) {
  const autoCss = esbuild.transformSync(autoCssCombined, {
    loader: 'css',
    minify: true
  }).code;
  // ib-car.css — hashed auto runtime stylesheet (see p4-scale-readiness-check)
  autoCssFile = `ib-car.${hashContent(autoCss)}.css`;
  writeFile(`assets/auto-runtime/${autoCssFile}`, autoCss);
}

const autoBundleResult = esbuild.buildSync({
  entryPoints: [path.join(root, 'js/auto/auto-app.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  sourcemap: false,
  write: false
});
const autoBundleCode = autoBundleResult.outputFiles[0].text;
const autoAppFile = `auto-app.${hashContent(autoBundleCode)}.js`;
writeFile(`assets/auto-runtime/${autoAppFile}`, autoBundleCode);
writeFile('assets/auto-runtime/auto-app.js', autoBundleCode);

const tatilAppSrc = path.join(root, 'js/tatil/tatil-app.js');
if (fs.existsSync(tatilAppSrc)) {
  const tatilAssetDir = path.join(dist, 'assets', 'tatil-runtime');
  fs.mkdirSync(tatilAssetDir, { recursive: true });
  const tatilBundleResult = esbuild.buildSync({
    entryPoints: [tatilAppSrc],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    sourcemap: false,
    write: false
  });
  const tatilBundleCode = tatilBundleResult.outputFiles[0].text;
  const tatilAppFile = `tatil-app.${hashContent(tatilBundleCode)}.js`;
  writeFile(`assets/tatil-runtime/${tatilAppFile}`, tatilBundleCode);
  writeFile('assets/tatil-runtime/tatil-app.js', tatilBundleCode);

  const tatilHtmlPath = path.join(dist, 'tatil', 'index.html');
  if (fs.existsSync(tatilHtmlPath)) {
    let tatilHtml = fs.readFileSync(tatilHtmlPath, 'utf8');
    tatilHtml = tatilHtml.replace(
      /\/js\/tatil\/tatil-app\.js/g,
      `/assets/tatil-runtime/${tatilAppFile}`
    );
    const tatilCssHashed = assetRefs.get('css/tatil.css');
    if (tatilCssHashed) {
      tatilHtml = tatilHtml.replace(/\/css\/tatil(?:\.[a-f0-9]+)?\.css/g, `/${tatilCssHashed}`);
    }
    const decisionCardCssHashed = assetRefs.get(decisionCategoryCardCssEntry);
    if (decisionCardCssHashed) {
      tatilHtml = tatilHtml.replace(
        /\/css\/decision-category-card(?:\.[a-f0-9]+)?\.css(?:\?v=\d+)?/g,
        `/${decisionCardCssHashed}`
      );
    }
    fs.writeFileSync(tatilHtmlPath, minifyHtml(tatilHtml));
  }
}

function bundleVerticalPage(entryRel, htmlRel, runtimeFolder, scriptPattern) {
  const entrySrc = path.join(root, entryRel);
  if (!fs.existsSync(entrySrc)) return;

  const assetDir = path.join(dist, 'assets', runtimeFolder);
  fs.mkdirSync(assetDir, { recursive: true });
  const bundleResult = esbuild.buildSync({
    entryPoints: [entrySrc],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    sourcemap: false,
    write: false
  });
  const bundleCode = bundleResult.outputFiles[0].text;
  const appFile = `${runtimeFolder.replace('-runtime', '')}-app.${hashContent(bundleCode)}.js`;
  writeFile(`assets/${runtimeFolder}/${appFile}`, bundleCode);
  writeFile(`assets/${runtimeFolder}/${runtimeFolder.replace('-runtime', '')}-app.js`, bundleCode);

  const htmlPath = path.join(dist, htmlRel);
  if (!fs.existsSync(htmlPath)) return;

  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(scriptPattern, `/assets/${runtimeFolder}/${appFile}`);
  const tatilCssHashed = assetRefs.get('css/tatil.css');
  const themesCssHashed = assetRefs.get('css/vertical-themes.css');
  const finansHeroCssHashed = assetRefs.get('css/finans-hero.css');
  const decisionCardCssHashed = assetRefs.get(decisionCategoryCardCssEntry);
  if (tatilCssHashed) {
    html = html.replace(/\/css\/tatil(?:\.[a-f0-9]+)?\.css/g, `/${tatilCssHashed}`);
  }
  if (themesCssHashed) {
    html = html.replace(/\/css\/vertical-themes(?:\.[a-f0-9]+)?\.css/g, `/${themesCssHashed}`);
  }
  if (finansHeroCssHashed) {
    html = html.replace(/\/css\/finans-hero(?:\.[a-f0-9]+)?\.css/g, `/${finansHeroCssHashed}`);
  }
  if (decisionCardCssHashed) {
    html = html.replace(
      /\/css\/decision-category-card(?:\.[a-f0-9]+)?\.css(?:\?v=\d+)?/g,
      `/${decisionCardCssHashed}`
    );
  }
  fs.writeFileSync(htmlPath, minifyHtml(html));
}

bundleVerticalPage(
  'js/finans/finans-app.js',
  'finans/index.html',
  'finans-runtime',
  /\/js\/finans\/finans-app\.js/g
);

// Sigorta — hashed runtime bundle (avoid /js/* immutable cache on fixed sigorta-app.js path)
bundleVerticalPage(
  'js/sigorta/sigorta-app.js',
  'sigorta/index.html',
  'sigorta-runtime',
  /\/js\/sigorta\/sigorta-app\.js/g
);

bundleVerticalPage(
  'js/kasko/kasko-app.js',
  'kasko/index.html',
  'kasko-runtime',
  /\/js\/kasko\/kasko-app\.js/g
);

bundleVerticalPage(
  'js/restoran/restoran-app.js',
  'restoran/index.html',
  'restoran-runtime',
  /\/js\/restoran\/restoran-app\.js/g
);

bundleVerticalPage(
  'js/restoran/reservation-page.js',
  'r/index.html',
  'reservation-runtime',
  /\/js\/restoran\/reservation-page\.js/g
);

bundleVerticalPage(
  'js/restoran/reservation-confirm-page.js',
  'r/onay/index.html',
  'reservation-confirm-runtime',
  /\/js\/restoran\/reservation-confirm-page\.js/g
);

bundleVerticalPage(
  'js/restoran/kds-admin.js',
  'garson/index.html',
  'kds-admin-runtime',
  /\/js\/restoran\/kds-admin\.js/g
);

bundleVerticalPage(
  'js/verticals/listing-analysis/listing-analysis-app.js',
  'ilan-analizi/index.html',
  'listing-analysis-runtime',
  /\/js\/verticals\/listing-analysis\/listing-analysis-app\.js/g
);

// AI Listings admin CRUD — static HTML only (no _redirects; see cloudflare-redirects-audit)
bundleVerticalPage(
  'js/admin/ai-listings-admin.js',
  'admin/ai-listings.html',
  'ai-listings-admin-runtime',
  /\/js\/admin\/ai-listings-admin\.js/g
);

const aiListingsAdminHtmlPath = path.join(dist, 'admin', 'ai-listings.html');
if (fs.existsSync(aiListingsAdminHtmlPath)) {
  const aiListingsAdminHtml = fs.readFileSync(aiListingsAdminHtmlPath, 'utf8');
  // /admin/listings/ is reserved for CRM deep-link shell (Karar Seçenekleri).
  writeFile('admin/ai-listings/index.html', aiListingsAdminHtml);
}

if (fs.existsSync(path.join(root, 'js/sigorta'))) {
  copyDir('js/sigorta');
  const bundledSigortaApp = path.join(dist, 'js/sigorta/sigorta-app.js');
  if (fs.existsSync(bundledSigortaApp)) {
    fs.unlinkSync(bundledSigortaApp);
  }
}

const housingAppSrc = path.join(root, 'js/real-estate/real-estate-app.js');
if (fs.existsSync(housingAppSrc)) {
  const housingAssetDir = path.join(dist, 'assets', 'real-estate-runtime');
  fs.mkdirSync(housingAssetDir, { recursive: true });
  const housingBundleResult = esbuild.buildSync({
    entryPoints: [housingAppSrc],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    sourcemap: false,
    write: false
  });
  const housingBundleCode = housingBundleResult.outputFiles[0].text;
  const housingAppFile = `real-estate-app.${hashContent(housingBundleCode)}.js`;
  writeFile(`assets/real-estate-runtime/${housingAppFile}`, housingBundleCode);
  writeFile('assets/real-estate-runtime/real-estate-app.js', housingBundleCode);

  const housingHtmlPath = path.join(dist, 'konut', 'index.html');
  if (fs.existsSync(housingHtmlPath)) {
    let housingHtml = fs.readFileSync(housingHtmlPath, 'utf8');
    housingHtml = housingHtml.replace(
      /\/js\/real-estate\/real-estate-app\.js/g,
      `/assets/real-estate-runtime/${housingAppFile}`
    );
    const housingCssHashed = assetRefs.get('css/real-estate.css');
    if (housingCssHashed) {
      housingHtml = housingHtml.replace(/\/css\/real-estate(?:\.[a-f0-9]+)?\.css/g, `/${housingCssHashed}`);
    }
    const decisionCardCssHashed = assetRefs.get(decisionCategoryCardCssEntry);
    if (decisionCardCssHashed) {
      housingHtml = housingHtml.replace(
        /\/css\/decision-category-card(?:\.[a-f0-9]+)?\.css(?:\?v=\d+)?/g,
        `/${decisionCardCssHashed}`
      );
    }
    fs.writeFileSync(housingHtmlPath, minifyHtml(housingHtml));
  }
}

const autoHtmlPath = path.join(dist, 'auto', 'index.html');
if (fs.existsSync(autoHtmlPath)) {
  let autoHtml = fs.readFileSync(autoHtmlPath, 'utf8');
  if (autoCssFile) {
    autoHtml = autoHtml.replace(
      /\/assets\/auto-runtime\/ib-car(?:\.[a-f0-9]+)?\.css/g,
      `/assets/auto-runtime/${autoCssFile}`
    );
    autoHtml = autoHtml.replace(/\/css\/auto\.[a-f0-9]+\.css/g, `/assets/auto-runtime/${autoCssFile}`);
    autoHtml = autoHtml.replace(/\/css\/auto\.css/g, `/assets/auto-runtime/${autoCssFile}`);
  }
  autoHtml = autoHtml.replace(
    /\/assets\/auto-runtime\/auto-app(?:\.[a-f0-9]+)?\.js(?:\?v=[^"']+)?/g,
    `/assets/auto-runtime/${autoAppFile}`
  );
  const decisionCardCssHashed = assetRefs.get(decisionCategoryCardCssEntry);
  if (decisionCardCssHashed) {
    autoHtml = autoHtml.replace(
      /\/css\/decision-category-card(?:\.[a-f0-9]+)?\.css(?:\?v=\d+)?/g,
      `/${decisionCardCssHashed}`
    );
  }
  fs.writeFileSync(autoHtmlPath, minifyHtml(autoHtml));
}

const manifest = {
  builtAt: new Date().toISOString(),
  files: []
};
walk(dist, (file) => {
  manifest.files.push({
    path: relative(file).replace(/^dist\//, ''),
    bytes: fs.statSync(file).size
  });
});
writeFile('build-manifest.json', JSON.stringify(manifest, null, 2));


// Create physical SPA route entrypoints to avoid Cloudflare Pages clean-url redirects.
// App-only SPA shells (SEO hubs /rehber/, /secenekler/, /karsilastir/ are static HTML from buildSeoPages)
const spaRoutes = ['favoriler', 'gecmis', 'profil', 'ilan-ekle', 'messages'];
const routeDocumentMeta = loadRouteMeta(root);

spaRoutes.forEach((route) => {
  const routeDir = path.join(dist, route);
  fs.mkdirSync(routeDir, { recursive: true });
  let shellHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  shellHtml = patchSpaShellHtml(shellHtml, route, routeDocumentMeta);
  fs.writeFileSync(path.join(routeDir, 'index.html'), minifyHtml(shellHtml));
});

const seoResult = buildSeoPages(dist);

const blogBuild = spawnSync(process.execPath, [path.join(root, 'scripts/build-blog-post-pages.cjs'), dist], {
  cwd: root,
  stdio: 'inherit',
  env: process.env
});
if (blogBuild.status !== 0) process.exit(blogBuild.status || 1);

/** Dynamic content list routes — SPA shells (must run after SEO/blog static pass). */
const dynamicContentSpaRoutes = [
  'blog',
  'duyurular',
  'kampanyalar',
  'karar-asistani',
  'secenekler',
  'karsilastir'
];
dynamicContentSpaRoutes.forEach((route) => {
  const routeDir = path.join(dist, route);
  fs.mkdirSync(routeDir, { recursive: true });
  let shellHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  shellHtml = patchSpaShellHtml(shellHtml, route, routeDocumentMeta);
  fs.writeFileSync(path.join(routeDir, 'index.html'), minifyHtml(shellHtml));
});

let blogPosts = [];
const blogManifestPath = path.join(dist, 'blog-posts-manifest.json');
if (fs.existsSync(blogManifestPath)) {
  try {
    blogPosts = JSON.parse(fs.readFileSync(blogManifestPath, 'utf8')).posts || [];
  } catch {
    blogPosts = [];
  }
}

/** Locale marketing SPA shells (/en/, /de/, …) with document meta */
loadLocaleIds().forEach((localeId) => {
  const localeDir = path.join(dist, localeId);
  fs.mkdirSync(localeDir, { recursive: true });
  let localeHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  localeHtml = injectLocaleShellMeta(localeHtml, localeId);
  fs.writeFileSync(path.join(localeDir, 'index.html'), minifyHtml(localeHtml));
});

/** SEO HTML is written after static pass — rewrite hashed CSS/JS refs */
const rewriteSeoHtmlAssets = () => {
  const seoRoots = [
    'rehber',
    'karar-asistani',
    'secenekler',
    'karsilastir',
    'metodoloji',
    'veri-kaynaklari',
    'planlar',
    'blog',
    'duyurular',
    'kampanyalar',
    'en',
    'de',
    'ar',
    'it',
    'fr',
    'es',
    'ja',
    'zh'
  ];
  seoRoots.forEach((name) => {
    const base = path.join(dist, name);
    if (!fs.existsSync(base)) return;
    walk(base, (file) => {
      if (!file.endsWith('.html')) return;
      let html = fs.readFileSync(file, 'utf8');
      html = rewriteAssetRefs(html);
      fs.writeFileSync(file, minifyHtml(html));
    });
  });
  ['hakkimizda.html', 'iletisim.html', 'yardim.html'].forEach((name) => {
    const file = path.join(dist, name);
    if (!fs.existsSync(file)) return;
    let html = rewriteAssetRefs(fs.readFileSync(file, 'utf8'));
    html = minifyHtml(html);
    fs.writeFileSync(file, html);
    fs.writeFileSync(path.join(root, name), html);
  });
};
rewriteSeoHtmlAssets();

generateSitemap(dist, { ...seoResult, blogPosts });
generateRobots(dist, seoResult.site);
injectVerticalFaqs(dist);

fs.copyFileSync(path.join(root, '_redirects'), path.join(dist, '_redirects'));

if (fs.existsSync(path.join(root, '_headers'))) {
  fs.copyFileSync(path.join(root, '_headers'), path.join(dist, '_headers'));
}

injectPartnerHtmlFiles(dist);

const { injectSiteSocialIntoHtml } = require('./lib/site-social-footer.cjs');
let socialInjectCount = 0;
walk(dist, (file) => {
  if (!file.endsWith('.html')) return;
  const before = fs.readFileSync(file, 'utf8');
  const after = injectSiteSocialIntoHtml(before);
  if (after === before) return;
  fs.writeFileSync(file, minifyHtml(after));
  socialInjectCount += 1;
});
if (socialInjectCount > 0) {
  console.log(`[social] footer hooks added to ${socialInjectCount} HTML file(s)`);
}

/** Social/cookie injectors may add unhashed /css/* refs — rewrite after all HTML mutations */
walk(dist, (file) => {
  if (!file.endsWith('.html')) return;
  const html = fs.readFileSync(file, 'utf8');
  const next = rewriteAssetRefs(html);
  if (next === html) return;
  fs.writeFileSync(file, minifyHtml(next));
});

const inlineAudit = spawnSync(process.execPath, [path.join(root, 'scripts/dist-inline-handlers-audit.cjs')], {
  cwd: root,
  stdio: 'inherit'
});
if (inlineAudit.status !== 0) process.exit(inlineAudit.status || 1);

const {
  getGoogleSiteVerificationCode,
  applyGoogleSiteVerificationToHtmlFiles
} = require('./lib/gsc-verification.cjs');
const gscCode = getGoogleSiteVerificationCode(process.env);
if (gscCode) {
  const gscResult = applyGoogleSiteVerificationToHtmlFiles(dist, { code: gscCode });
  console.log(
    `[gsc] google-site-verification meta injected into ${gscResult.injected} HTML file(s)`
  );
} else {
  console.warn(
    '[gsc] GOOGLE_SITE_VERIFICATION not set — skip Search Console HTML tag (see .github/SECRETS.example.md)'
  );
}

const { getAdminDeepLinkSlugs } = require('./lib/admin-deep-links.cjs');
const {
  getGa4MeasurementId,
  applyGa4ConsentHeadToHtmlFiles
} = require('./lib/ga4-consent-head.cjs');
const ga4Id = getGa4MeasurementId(process.env, root);
if (ga4Id) {
  const ga4Result = applyGa4ConsentHeadToHtmlFiles(dist, { measurementId: ga4Id });
  console.log(`[ga4] consent-mode head snippet injected into ${ga4Result.injected} HTML file(s)`);
} else {
  console.warn('[ga4] GA4_MEASUREMENT_ID not set — skip gtag head (see docs/ZIYARETCI_ANALITIK_KURULUM.md)');
}

const { applyAdSenseHeadToHtmlFiles } = require('./lib/inject-adsense-head.cjs');
const adsenseResult = applyAdSenseHeadToHtmlFiles(dist);
console.log(`[adsense] head script injected into ${adsenseResult.injected} HTML file(s)`);

/** Admin deep links — physical shells so /admin/* is not rewritten by /* SPA fallback */
const adminIndexPath = path.join(dist, 'admin', 'index.html');
if (fs.existsSync(adminIndexPath)) {
  const adminShellHtml = fs.readFileSync(adminIndexPath, 'utf8');
  const adminDeepLinkSlugs = getAdminDeepLinkSlugs();
  adminDeepLinkSlugs.forEach((slug) => {
    const routeDir = path.join(dist, 'admin', slug);
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, 'index.html'), adminShellHtml);
  });
  console.log(`[admin] deep-link shells: ${adminDeepLinkSlugs.length} route(s)`);
}

console.log('Production build complete: dist/');
console.log('Built ' + manifest.files.length + ' files.');
