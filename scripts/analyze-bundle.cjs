const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const reportPath = path.join(dist, 'bundle-report.json');
const maxChunkBytes = 320 * 1024;
/** Initial product path: main app + auto + primary stylesheet (hashed). */
const maxCriticalBytes = 750 * 1024;

const criticalPatterns = [
  /^js\/app\.bundle-[A-Z0-9]+\.js$/,
  /^assets\/auto-runtime\/auto-app\.js$/,
  /^css\/style\.[a-f0-9]+\.css$/
];

const files = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      const relativePath = path.relative(dist, fullPath).split(path.sep).join('/');
      const bytes = fs.statSync(fullPath).size;
      files.push({ path: relativePath, bytes });
    }
  }
};

if (!fs.existsSync(dist)) {
  console.error('dist/ not found. Run npm run build first.');
  process.exit(1);
}

walk(dist);

const scriptAndStyleFiles = files
  .filter((file) => /\.(js|css)$/.test(file.path))
  .sort((a, b) => b.bytes - a.bytes);

const criticalFiles = scriptAndStyleFiles.filter((file) =>
  criticalPatterns.some((re) => re.test(file.path))
);

const totalBytes = scriptAndStyleFiles.reduce((sum, file) => sum + file.bytes, 0);
const criticalBytes = criticalFiles.reduce((sum, file) => sum + file.bytes, 0);
const oversized = scriptAndStyleFiles.filter((file) => file.bytes > maxChunkBytes);

const report = {
  generatedAt: new Date().toISOString(),
  maxChunkBytes,
  maxCriticalBytes,
  totalBytes,
  criticalBytes,
  criticalFiles,
  oversized,
  files: scriptAndStyleFiles
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('Bundle report written to dist/bundle-report.json');
console.log('JS/CSS total (all dist): ' + totalBytes + ' bytes');
console.log('Critical path (app + auto + style): ' + criticalBytes + ' bytes');

if (oversized.length > 0) {
  console.warn('Large chunks detected:');
  oversized.forEach((file) => console.warn('- ' + file.path + ': ' + file.bytes + ' bytes'));
}

if (criticalFiles.length < 3) {
  console.error('Critical path bundles missing — expected app, auto-app, style.css hash');
  process.exit(1);
}

if (criticalBytes > maxCriticalBytes) {
  console.error('Critical path budget exceeded: ' + criticalBytes + ' bytes');
  process.exit(1);
}
