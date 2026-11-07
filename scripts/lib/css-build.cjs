const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { HOMEPAGE_EXTENSION } = require('./css-bundles.cjs');

const HOMEPAGE_BUNDLE_ENTRY = 'css/bundles/homepage.bundle.css';
const CSS_BUNDLE_ENTRIES = new Set([
  'css/style.css',
  HOMEPAGE_BUNDLE_ENTRY
]);

/**
 * Rewrite relative @import paths to hashed filenames produced in the same build.
 * @param {string} css
 * @param {Map<string, string>} assetRefs originalPath -> hashedPath (e.g. css/foo.css -> css/foo.abc.css)
 */
function rewriteCssImports(css, assetRefs, originalPath, root) {
  const fileDir = path.dirname(path.join(root, originalPath));

  return css.replace(
    /@import\s*(?:url\()?['"]([^'"]+)['"]\)?\s*;?/g,
    (match, importPath) => {
      if (/^(https?:|data:)/i.test(importPath)) return match;

      const absImport = path.resolve(fileDir, importPath);
      const relToRoot = path.relative(root, absImport).split(path.sep).join('/');
      const hashed = assetRefs.get(relToRoot);
      if (!hashed) return match;

      const absHashed = path.join(root, hashed);
      let relImport = path.relative(fileDir, absHashed).split(path.sep).join('/');
      if (!relImport.startsWith('.')) relImport = `./${relImport}`;

      return `@import '${relImport}';`;
    }
  );
}

/**
 * Rebase relative URLs from the homepage CSS sources to public root URLs.
 * All current homepage bundle source files must share one CSS directory.
 *
 * @param {string} css
 * @param {string} root
 * @param {string} sourceDir
 */
function rewriteBundledCssAssetUrls(css, root, sourceDir) {
  const projectRoot = path.resolve(root);
  const sourceBaseDir = path.resolve(projectRoot, sourceDir);

  return css.replace(
    /url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi,
    (match, quote, quoted, unquoted) => {
      const raw = String(quoted ?? unquoted ?? '').trim();

      if (
        !raw ||
        raw.startsWith('/') ||
        /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(raw) ||
        /^(?:var|attr)\(/i.test(raw)
      ) {
        return match;
      }

      const suffixIndex = raw.search(/[?#]/);
      const pathname = suffixIndex >= 0 ? raw.slice(0, suffixIndex) : raw;
      const suffix = suffixIndex >= 0 ? raw.slice(suffixIndex) : '';

      if (!pathname) return match;

      let decodedPath;
      try {
        decodedPath = decodeURIComponent(pathname);
      } catch {
        throw new Error(`Invalid encoded CSS asset URL: ${raw}`);
      }

      const absolutePath = path.resolve(sourceBaseDir, decodedPath);
      const relativePath = path.relative(projectRoot, absolutePath);

      if (
        relativePath === '..' ||
        relativePath.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativePath)
      ) {
        throw new Error(`CSS asset resolves outside project root: ${raw}`);
      }

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`CSS asset does not exist: ${raw} (${absolutePath})`);
      }

      const publicPath = '/' + relativePath
        .split(path.sep)
        .map(segment => encodeURIComponent(segment))
        .join('/');

      return `url("${publicPath}${suffix}")`;
    }
  );
}

function getHomepageBundleSourceDir() {
  const sourceDirs = new Set(
    HOMEPAGE_EXTENSION.map(source => path.dirname(source))
  );

  if (sourceDirs.size !== 1) {
    throw new Error(
      'Homepage CSS sources must share one directory before URL rebasing.'
    );
  }

  return [...sourceDirs][0];
}

/**
 * @param {object} opts
 * @param {string} opts.root
 * @param {Map<string, string>} opts.assetRefs
 * @param {(relPath: string, content: string) => void} opts.writeFile
 * @param {(filePath: string) => string} opts.relative
 * @param {(relPath: string, hash: string) => string} opts.withHashName
 * @param {(content: string) => string} opts.hashContent
 * @param {(dir: string, cb: (file: string) => void) => void} opts.walk
 */
function buildHashedCssAssets(opts) {
  const { root, assetRefs, writeFile, relative, withHashName, hashContent, walk } = opts;
  const cssDir = path.join(root, 'css');
  const entries = [];

  walk(cssDir, (file) => {
    if (!file.endsWith('.css')) return;
    entries.push(file);
  });

  const staged = new Map();

  for (const file of entries) {
    const originalPath = relative(file);
    const source = fs.readFileSync(file, 'utf8');
    let code;

    if (CSS_BUNDLE_ENTRIES.has(originalPath)) {
      const isHomepageBundle = originalPath === HOMEPAGE_BUNDLE_ENTRY;

      const bundle = esbuild.buildSync({
        entryPoints: [file],
        bundle: true,
        write: false,
        loader: { '.css': 'css' },
        minify: true,
        ...(isHomepageBundle
          ? { external: ['/assets/*', '../assets/*'] }
          : {})
      });

      code = bundle.outputFiles[0].text;

      if (isHomepageBundle) {
        code = rewriteBundledCssAssetUrls(
          code,
          root,
          getHomepageBundleSourceDir()
        );
      }
    } else {
      code = esbuild.transformSync(source, { loader: 'css', minify: true }).code;
    }

    staged.set(originalPath, code);
  }

  let refs = new Map();
  for (const [originalPath, code] of staged) {
    refs.set(originalPath, withHashName(originalPath, hashContent(code)));
  }

  let rewritten = new Map();
  let stable = false;
  const maxIterations = Math.max(4, entries.length);

  for (let iteration = 0; iteration < maxIterations && !stable; iteration++) {
    rewritten.clear();

    for (const [originalPath, code] of staged) {
      const next = CSS_BUNDLE_ENTRIES.has(originalPath)
        ? code
        : rewriteCssImports(code, refs, originalPath, root);
      rewritten.set(originalPath, next);
    }

    const nextRefs = new Map();
    for (const [originalPath, code] of rewritten) {
      nextRefs.set(originalPath, withHashName(originalPath, hashContent(code)));
    }

    stable = true;
    for (const [originalPath, hashedPath] of nextRefs) {
      if (refs.get(originalPath) !== hashedPath) {
        stable = false;
        break;
      }
    }

    refs = nextRefs;
  }

  if (!stable) {
    throw new Error('CSS asset hashing did not stabilize — check @import graph');
  }

  for (const [originalPath, code] of rewritten) {
    const hashedPath = refs.get(originalPath);
    assetRefs.set(originalPath, hashedPath);
    writeFile(hashedPath, code);
  }
}

module.exports = {
  buildHashedCssAssets,
  rewriteCssImports,
  rewriteBundledCssAssetUrls,
  CSS_BUNDLE_ENTRIES
};
