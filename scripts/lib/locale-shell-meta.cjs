'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

const LOCALE_META = {
  en: {
    lang: 'en',
    title: 'isteBul | AI-Powered Decision Platform',
    description:
      'Analyze total cost, risk, and fit for car, home, travel, finance, and insurance decisions with AI-assisted intelligence.'
  },
  de: {
    lang: 'de',
    title: 'isteBul | KI-gestützte Entscheidungsplattform',
    description:
      'Gesamtkosten, Risiken und Passung für Auto, Wohnen, Reise, Finanzierung und Versicherung — KI-gestützt analysieren.'
  },
  ar: {
    lang: 'ar',
    title: 'isteBul | منصة قرارات مدعومة بالذكاء الاصطناعي',
    description:
      'حلل التكلفة الإجمالية والمخاطر والملاءمة لقرارات السيارة والسكن والسفر والتمويل والتأمين.'
  },
  it: {
    lang: 'it',
    title: 'isteBul | Piattaforma decisionale con IA',
    description:
      'Analizza costo totale, rischi e idoneità per auto, casa, viaggi, finanziamento e assicurazione.'
  },
  fr: {
    lang: 'fr',
    title: 'isteBul | Plateforme décisionnelle IA',
    description:
      'Analysez coût total, risques et adéquation pour auto, logement, voyage, financement et assurance.'
  },
  es: {
    lang: 'es',
    title: 'isteBul | Plataforma de decisiones con IA',
    description:
      'Analice coste total, riesgos y adecuación para coche, vivienda, viajes, financiación y seguros.'
  },
  ja: {
    lang: 'ja',
    title: 'isteBul | AI意思決定プラットフォーム',
    description: '車、住宅、旅行、ローン、保険の意思決定をAI分析で支援します。'
  },
  zh: {
    lang: 'zh',
    title: 'isteBul | AI 决策平台',
    description: '用 AI 分析汽车、住房、旅行、融资和保险决策的总成本、风险与匹配度。'
  }
};

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function injectLocaleShellMeta(html, localeId, siteOrigin = 'https://www.istebul.com') {
  const meta = LOCALE_META[localeId];
  if (!meta) return html;

  const canonical = `${siteOrigin.replace(/\/$/, '')}/${localeId}/`;
  let out = html;

  out = out.replace(/<html\s+lang="[^"]+"/, `<html lang="${meta.lang}"`);
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttr(meta.title)}</title>`);

  const replaceMetaById = (id, content) => {
    const re = new RegExp(`(<meta[^>]+id="${id}"[^>]+content=")[^"]*(")`, 'i');
    if (re.test(out)) out = out.replace(re, `$1${escapeAttr(content)}$2`);
  };

  replaceMetaById('meta-description', meta.description);
  replaceMetaById('meta-og-title', meta.title);
  replaceMetaById('meta-og-description', meta.description);
  replaceMetaById('meta-og-url', canonical);
  replaceMetaById('meta-twitter-title', meta.title);
  replaceMetaById('meta-twitter-description', meta.description);

  const canonRe = /(<link rel="canonical" id="meta-canonical" href=")[^"]*(")/i;
  if (canonRe.test(out)) out = out.replace(canonRe, `$1${escapeAttr(canonical)}$2`);

  if (localeId === 'ar' && !out.includes('/css/rtl.css')) {
    out = out.replace(
      '</head>',
      '  <link rel="stylesheet" href="/css/rtl.css">\n</head>'
    );
  }

  return out;
}

function loadLocaleIds() {
  const file = path.join(root, 'data/seo/locales.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Object.keys(data.alternates || {}).filter((id) => id !== 'tr');
}

module.exports = {
  LOCALE_META,
  injectLocaleShellMeta,
  loadLocaleIds
};
