const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const CSS_BUNDLE_ENTRIES = new Set(['css/style.css']);

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
      const bundle = esbuild.buildSync({
        entryPoints: [file],
        bundle: true,
        write: false,
        loader: { '.css': 'css' },
        minify: true
      });
      code = bundle.outputFiles[0].text;
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

module.exports = { buildHashedCssAssets, rewriteCssImports, CSS_BUNDLE_ENTRIES };
