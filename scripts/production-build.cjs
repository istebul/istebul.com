const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const esbuild = require('esbuild');
const crypto = require('crypto');

const root = process.cwd();
const dist = path.join(root, 'dist');
const staticRoots = ['assets', 'data', 'docs'];
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
const staticFiles = ['_headers', '_redirects', '_routes.json', 'index.html', 'offline.html', 'manifest.json', 'sw.js', 'robots.txt', 'sitemap.xml', 'admin-panel.html', 'importmap.json', 'favicon.ico', 'auto/index.html', 'metodoloji/index.html', 'konut/index.html', 'tatil/index.html', 'finans/index.html', 'sigorta/index.html', 'kasko/index.html', 'gizlilik.html', 'kvkk.html', 'kullanim-sartlari.html', 'cerez-politikasi.html', 'partner-olun.html', 'partner-planlar.html', 'partner-guven.html', 'partner-docs.html', 'partner-onboarding.html', 'partner-basvuru.html', 'partner-closing-kit.html', 'karar-moat.html', 'css/seo-landing.css', 'css/istebul-ui-final-v5.css', 'css/istebul-ui-product-cards-v6.css', 'css/istebul-premium-final-v7.css', 'css/home-header-saas-v1.css', 'css/home-product-cards-enterprise-v1.css', 'css/corporate-pages.css', 'css/partner-platform.css', 'css/admin-partner-ops.css',
    'css/admin-internal-dashboards.css',
    'css/admin-ops-ai-assistant.css', 'css/growth-cro.css', 'css/growth-retention.css', 'css/help-center.css', 'css/sales-partner.css'];
const { buildSeoPages, generateSitemap, generateRobots } = require('./lib/seo.cjs');
const { injectVerticalFaqs } = require('./lib/seo-vertical-faq.cjs');
const { injectRouteBootstrap, writeRouteBootstrapFile } = require('./lib/route-bootstrap.cjs');
const { injectPremiumPrerender } = require('./lib/inject-premium-prerender.cjs');
const { injectPartnerHtmlFiles } = require('./lib/inject-partner-prerender.cjs');
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

const injectPerformanceHints = (html, appBundleFile) => {
  let output = html;

  output = output.replace(
    '<!-- perf:importmap -->',
    ''
  );

  const styleHashed = assetRefs.get('css/style.css');
  if (styleHashed) {
    output = output.replace(
      '<!-- perf:preload-style -->',
      `<link rel="preload" href="/${styleHashed}" as="style">`
    );
  } else {
    output = output.replace('<!-- perf:preload-style -->', '');
  }

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

const minifyHtml = (source) => source
  .replace(/<!--[\s\S]*?-->/g, '')
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
  formatEnvJs
} = require('./lib/public-env.cjs');

const publicEnv = withCiBuildPublicEnvFallback(buildPublicEnv(process.env, root), process.env);
assertPublicEnvForBuild(publicEnv, { strict: isStrictPublicEnvBuild() });

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
  outdir: path.join(dist, 'js')
});

const appBundleFile = fs.readdirSync(path.join(dist, 'js')).find((name) => /^app\.bundle-[A-Z0-9]+\.js$/.test(name));
if (!appBundleFile) {
  throw new Error('App bundle file was not generated.');
}

pendingStaticFiles.forEach(({ file, source }) => {
  let html = rewriteAssetRefs(source);
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
  'css/auto-question-ux.css',
  'css/enterprise-card-readability.css',
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
  if (tatilCssHashed) {
    html = html.replace(/\/css\/tatil(?:\.[a-f0-9]+)?\.css/g, `/${tatilCssHashed}`);
  }
  if (themesCssHashed) {
    html = html.replace(/\/css\/vertical-themes(?:\.[a-f0-9]+)?\.css/g, `/${themesCssHashed}`);
  }
  if (finansHeroCssHashed) {
    html = html.replace(/\/css\/finans-hero(?:\.[a-f0-9]+)?\.css/g, `/${finansHeroCssHashed}`);
  }
  fs.writeFileSync(htmlPath, minifyHtml(html));
}

bundleVerticalPage(
  'js/finans/finans-app.js',
  'finans/index.html',
  'finans-runtime',
  /\/js\/finans\/finans-app\.js/g
);

// Sigorta V2 — copy js/sigorta for config/intake; bundle app in place (HTML path unchanged)
if (fs.existsSync(path.join(root, 'js/sigorta'))) {
  copyDir('js/sigorta');
  const sigortaAppSrc = path.join(root, 'js/sigorta/sigorta-app.js');
  if (fs.existsSync(sigortaAppSrc)) {
    esbuild.buildSync({
      entryPoints: [sigortaAppSrc],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      minify: true,
      sourcemap: false,
      outfile: path.join(dist, 'js/sigorta/sigorta-app.js')
    });
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
// App-only SPA shells (SEO hubs /rehber/, /ilanlar/, /karsilastir/ are static HTML from buildSeoPages)
const spaRoutes = ['favoriler', 'gecmis', 'profil', 'ilan-ekle', 'messages'];

spaRoutes.forEach((route) => {
  const routeDir = path.join(dist, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.copyFileSync(path.join(dist, 'index.html'), path.join(routeDir, 'index.html'));
});

const seoResult = buildSeoPages(dist);

/** SEO HTML is written after static pass — rewrite hashed CSS/JS refs */
const rewriteSeoHtmlAssets = () => {
  const seoRoots = ['rehber', 'karar-asistani', 'ilanlar', 'karsilastir', 'metodoloji'];
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

generateSitemap(dist, seoResult);
generateRobots(dist, seoResult.site);
injectVerticalFaqs(dist);

fs.copyFileSync(path.join(root, '_redirects'), path.join(dist, '_redirects'));

if (fs.existsSync(path.join(root, '_headers'))) {
  fs.copyFileSync(path.join(root, '_headers'), path.join(dist, '_headers'));
}

injectPartnerHtmlFiles(dist);

console.log('Production build complete: dist/');
console.log('Built ' + manifest.files.length + ' files.');
