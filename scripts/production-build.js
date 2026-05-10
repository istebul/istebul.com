const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const esbuild = require('esbuild');

const root = process.cwd();
const dist = path.join(root, 'dist');
const staticRoots = ['assets', 'data'];
const staticFiles = ['index.html', 'offline.html', 'manifest.json', 'sw.js', 'robots.txt', 'sitemap.xml', 'admin-panel.html'];
const publicEnvKeys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SENTRY_DSN', 'LOGROCKET_APP_ID'];

const runCheck = spawnSync(process.execPath, [path.join(root, 'scripts/check-syntax.js')], {
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

const minifyHtml = (source) => source
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/>\s+</g, '><')
  .replace(/\s{2,}/g, ' ')
  .trim();

staticRoots.forEach(copyDir);

const publicEnv = publicEnvKeys.reduce((env, key) => {
  env[key] = process.env[key] || '';
  return env;
}, {});
writeFile('env.js', 'window.__env = Object.assign({}, window.__env || {}, ' + JSON.stringify(publicEnv) + ');\n');

staticFiles.forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.html')) {
    writeFile(file, minifyHtml(source));
  } else if (file.endsWith('.js')) {
    writeFile(file, esbuild.transformSync(source, { loader: 'js', minify: true, target: 'es2020' }).code);
  } else {
    copyFile(file);
  }
});

walk(path.join(root, 'css'), (file) => {
  if (!file.endsWith('.css')) return;

  const source = fs.readFileSync(file, 'utf8');
  writeFile(relative(file), esbuild.transformSync(source, { loader: 'css', minify: true }).code);
});

walk(path.join(root, 'js'), (file) => {
  if (!file.endsWith('.js')) return;

  const source = fs.readFileSync(file, 'utf8');
  writeFile(relative(file), esbuild.transformSync(source, { loader: 'js', minify: true, target: 'es2020' }).code);
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

console.log('Production build complete: dist/');
console.log('Built ' + manifest.files.length + ' files.');
