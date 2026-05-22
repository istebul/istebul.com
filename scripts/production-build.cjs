const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const esbuild = require('esbuild');
const crypto = require('crypto');

const root = process.cwd();
const dist = path.join(root, 'dist');
const staticRoots = ['js/auto', 'assets', 'data'];
const staticFiles = ['_headers', '_redirects', 'index.html', 'offline.html', 'manifest.json', 'sw.js', 'robots.txt', 'sitemap.xml', 'admin-panel.html', 'favicon.ico', 'auto/index.html', 'hakkimizda.html', 'iletisim.html', 'gizlilik.html', 'kvkk.html', 'kullanim-sartlari.html', 'partner-olun.html'];
const publicEnvKeys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SENTRY_DSN', 'LOGROCKET_APP_ID'];

const runCheck = spawnSync(process.execPath, [path.join(root, 'scripts/check-syntax.cjs')], {
  cwd: root,
  stdio: 'inherit'
});
if (runCheck.status !== 0) process.exit(runCheck.status || 1);

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

const minifyHtml = (source) => source
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/>\s+</g, '><')
  .trim();

staticRoots.forEach(copyDir);

const publicEnv = publicEnvKeys.reduce((env, key) => {
  env[key] = process.env[key] || '';
  return env;
}, {});
writeFile('env.js', 'window.__env = Object.assign({}, window.__env || {}, ' + JSON.stringify(publicEnv) + ');\n');

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

walk(path.join(root, 'css'), (file) => {
  if (!file.endsWith('.css')) return;

  const source = fs.readFileSync(file, 'utf8');
  const minified = esbuild.transformSync(source, { loader: 'css', minify: true }).code;
  const originalPath = relative(file);
  const hashedPath = withHashName(originalPath, hashContent(minified));

  assetRefs.set(originalPath, hashedPath);
  writeFile(originalPath, minified);
  writeFile(hashedPath, minified);
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
    html = html.replace(/js\/app\.bundle(?:-[A-Z0-9]+)?\.js(?:\?v=\d+)?/g, 'js/' + appBundleFile);
  }

  if (file === 'auto/index.html') {
    const autoVersion = Date.now();
    html = html.replace(/auto-app\.js\?v=\d+/g, `auto-app.js?v=${autoVersion}`);
  }

  writeFile(file, minifyHtml(html));
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
const spaRoutes = [
  'karsilastir',
  'karar-asistani',
  'favoriler',
  'gecmis',
  'profil',
  'ilanlar',
  'ilan-ekle',
  'messages'
];

spaRoutes.forEach((route) => {
  const routeDir = path.join(dist, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.copyFileSync(path.join(dist, 'index.html'), path.join(routeDir, 'index.html'));
});

fs.copyFileSync(path.join(root, '_redirects'), path.join(dist, '_redirects'));

if (fs.existsSync(path.join(root, '_headers'))) {
  fs.copyFileSync(path.join(root, '_headers'), path.join(dist, '_headers'));
}

// Force Auto page to use stable asset paths to avoid corrupted hashed edge assets.
const autoHtmlPath = path.join(dist, 'auto', 'index.html');
if (fs.existsSync(autoHtmlPath)) {
  let autoHtml = fs.readFileSync(autoHtmlPath, 'utf8');
  autoHtml = autoHtml.replace(/\/css\/auto\.[a-f0-9]+\.css/g, '/css/auto.css');
  autoHtml = autoHtml.replace(/\/js\/auto\/auto-app\.js\?v=[0-9]+/g, '/js/auto/auto-app.js?v=stable-auto');
  fs.writeFileSync(autoHtmlPath, autoHtml);
}

console.log('Production build complete: dist/');
console.log('Built ' + manifest.files.length + ' files.');
