'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

function faqJsonLd(faqs) {
  if (!faqs?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

function injectFaqIntoHtml(html, faqs) {
  const block = faqJsonLd(faqs);
  if (!block) return html;
  const script = `<script type="application/ld+json">${JSON.stringify(block)}</script>`;
  if (html.includes('"@type":"FAQPage"') || html.includes('"@type": "FAQPage"')) {
    return html;
  }
  return html.replace('</head>', `  ${script}\n</head>`);
}

function injectVerticalFaqs(targetDir) {
  const faqMap = JSON.parse(fs.readFileSync(path.join(root, 'data/seo/vertical-faqs.json'), 'utf8'));
  const mapping = [
    { key: 'auto', rel: 'auto/index.html' },
    { key: 'konut', rel: 'konut/index.html' },
    { key: 'tatil', rel: 'tatil/index.html' },
    { key: 'finans', rel: 'finans/index.html' },
    { key: 'metodoloji', rel: 'metodoloji/index.html' }
  ];

  mapping.forEach(({ key, rel }) => {
    const faqs = faqMap[key];
    if (!faqs) return;

    [path.join(root, rel), path.join(targetDir, rel)].forEach((filePath) => {
      if (!fs.existsSync(filePath)) return;
      const html = fs.readFileSync(filePath, 'utf8');
      fs.writeFileSync(filePath, injectFaqIntoHtml(html, faqs));
    });
  });
}

module.exports = { injectVerticalFaqs, faqJsonLd };
