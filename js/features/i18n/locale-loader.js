/** Lazy locale marketing bundles — one dynamic chunk per locale. */

const LOCALE_LOADERS = Object.freeze({
  tr: () => import('./locale-bundles/tr.js'),
  en: () => import('./locale-bundles/en.js'),
  de: () => import('./locale-bundles/de.js'),
  ar: () => import('./locale-bundles/ar.js'),
  it: () => import('./locale-bundles/it.js'),
  fr: () => import('./locale-bundles/fr.js'),
  es: () => import('./locale-bundles/es.js'),
  ja: () => import('./locale-bundles/ja.js'),
  zh: () => import('./locale-bundles/zh.js')
});

const cache = new Map();

function mergeLocale(base, extra) {
  if (!extra || typeof extra !== 'object') return base;
  const output = { ...(base || {}) };
  for (const [key, value] of Object.entries(extra)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = mergeLocale(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

export async function loadLocaleBundle(localeId) {
  const id = LOCALE_LOADERS[localeId] ? localeId : 'en';
  if (cache.has(id)) return cache.get(id);

  const loader = LOCALE_LOADERS[id] || LOCALE_LOADERS.en;
  const mod = await loader();
  const bundle = mod.default || {};
  cache.set(id, bundle);
  return bundle;
}

export function mergeLocaleBundle(coreLocale, bundle) {
  return mergeLocale(coreLocale, bundle);
}
