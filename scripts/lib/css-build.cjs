const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const CSS_BUNDLE_ENTRIES = new Set(['css/style.css']);

/**
 * Rewrite relative @import paths to hashed filenames produced in the same build.
 * @param {string} css
 * @param {Map<string, string>} assetRefs originalPath -> hashedPath (e.g. css/foo.css -> css/foo.abc.css)
 */
function rewriteCssImports(css, assetRefs) {
  return css.replace(
    /@import\s*(?:url\()?['"](\.\/)?([^'"]+)['"]\)?\s*;?/g,
    (match, _dot, importFile) => {
      const normalized = importFile.replace(/^\.\//, '');
      const candidates = [
        `css/${normalized}`,
        normalized.startsWith('css/') ? normalized : null
      ].filter(Boolean);

      let hashed = null;
      for (const key of candidates) {
        if (assetRefs.has(key)) {
          hashed = assetRefs.get(key);
          break;
        }
      }
      if (!hashed) return match;
      return `@import "./${path.basename(hashed)}";`;
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

  const provisionalRefs = new Map();
  for (const [originalPath, code] of staged) {
    provisionalRefs.set(originalPath, withHashName(originalPath, hashContent(code)));
  }

  const rewritten = new Map();
  for (const [originalPath, code] of staged) {
    const next =
      CSS_BUNDLE_ENTRIES.has(originalPath) ? code : rewriteCssImports(code, provisionalRefs);
    rewritten.set(originalPath, next);
  }

  for (const [originalPath, code] of rewritten) {
    const hashedPath = withHashName(originalPath, hashContent(code));
    assetRefs.set(originalPath, hashedPath);
    writeFile(hashedPath, code);
  }
}

module.exports = { buildHashedCssAssets, rewriteCssImports, CSS_BUNDLE_ENTRIES };
