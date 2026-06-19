'use strict';

const fs = require('fs');
const path = require('path');
const { markdownToHtml, escapeHtml } = require('./md-lite.cjs');

const BRAND = {
  bg: '#0F172A',
  accent: '#2563EB',
  text: '#F8FAFC',
  muted: '#94A3B8',
  card: '#1E293B'
};

function baseStyles(extra = '') {
  return `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
    color: #0f172a;
    line-height: 1.5;
    font-size: 11pt;
    margin: 0;
  }
  h1 { font-size: 22pt; margin: 0 0 8px; color: ${BRAND.bg}; }
  h2 { font-size: 14pt; margin: 20px 0 8px; color: ${BRAND.accent}; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  h3 { font-size: 12pt; margin: 14px 0 6px; }
  p { margin: 0 0 10px; }
  ul { margin: 0 0 12px 18px; padding: 0; }
  li { margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 10pt; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; }
  blockquote { margin: 12px 0; padding: 10px 14px; background: #f8fafc; border-left: 4px solid ${BRAND.accent}; color: #334155; }
  pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; font-size: 9pt; overflow: hidden; white-space: pre-wrap; }
  code { font-family: ui-monospace, monospace; font-size: 9pt; }
  .cover {
    background: linear-gradient(135deg, ${BRAND.bg} 0%, #1e3a5f 100%);
    color: ${BRAND.text};
    min-height: 240mm;
    padding: 48px 40px;
    page-break-after: always;
  }
  .cover h1 { color: #fff; font-size: 32pt; }
  .cover .tag { color: ${BRAND.muted}; font-size: 12pt; margin-top: 24px; }
  .cover .meta { margin-top: 48px; font-size: 11pt; color: ${BRAND.muted}; }
  .footer-note { margin-top: 24px; font-size: 9pt; color: #64748b; }
  .section { padding: 0 4px; }
  ${extra}
  `;
}

function slideStyles() {
  return `
  @page { size: 338.67mm 190.5mm; margin: 0; }
  body { margin: 0; background: ${BRAND.bg}; color: ${BRAND.text}; font-family: "Inter", system-ui, sans-serif; }
  .slide {
    width: 338.67mm;
    height: 190.5mm;
    padding: 28mm 24mm;
    page-break-after: always;
    position: relative;
    overflow: hidden;
    background: linear-gradient(160deg, ${BRAND.bg} 0%, #172554 55%, #1e3a8a 100%);
  }
  .slide:last-child { page-break-after: auto; }
  .slide h1 { font-size: 36pt; margin: 0 0 12px; color: #fff; line-height: 1.15; }
  .slide h2 { font-size: 28pt; margin: 0 0 16px; color: #93c5fd; border: none; }
  .slide h3 { font-size: 18pt; color: #bfdbfe; margin: 0 0 12px; }
  .slide p, .slide li { font-size: 14pt; color: #e2e8f0; }
  .slide ul { margin: 0 0 12px 22px; }
  .slide table { font-size: 11pt; margin-top: 8px; }
  .slide th { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.2); }
  .slide td { color: #e2e8f0; border-color: rgba(255,255,255,0.15); background: rgba(15,23,42,0.4); }
  .slide blockquote { background: rgba(37,99,235,0.2); border-left-color: #60a5fa; color: #dbeafe; }
  .slide pre { font-size: 10pt; background: rgba(0,0,0,0.35); }
  .slide-num { position: absolute; bottom: 12mm; right: 16mm; font-size: 10pt; color: ${BRAND.muted}; }
  .brand { position: absolute; top: 12mm; left: 24mm; font-size: 11pt; letter-spacing: 0.08em; text-transform: uppercase; color: #60a5fa; }
  `;
}

function wrapReport({ title, subtitle, bodyHtml }) {
  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>${baseStyles()}</style>
</head>
<body>
  <section class="cover">
    <div class="brand">isteBul · Investor</div>
    <h1>${escapeHtml(title)}</h1>
    <p class="tag">${escapeHtml(subtitle)}</p>
    <p class="meta">www.istebul.com · ${new Date().toISOString().slice(0, 10)} · Gizli — yalnızca yatırımcı paylaşımı</p>
  </section>
  <div class="section">${bodyHtml}</div>
  <p class="footer-note">Canlı metrikler için: npm run metrics:investor:pack · Bu rapor statik özet içerir; toplantı öncesi snapshot güncellenmelidir.</p>
</body>
</html>`;
}

function wrapSlides(slidesHtml) {
  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>isteBul Pitch Deck</title>
  <style>${slideStyles()}</style>
</head>
<body>
${slidesHtml}
</body>
</html>`;
}

function readDoc(root, rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function stripFrontmatter(md) {
  if (md.startsWith('---')) {
    const end = md.indexOf('\n---', 3);
    if (end !== -1) return md.slice(end + 4).trim();
  }
  return md;
}

function deckSlidesFromMarkdown(md) {
  const body = stripFrontmatter(md);
  const chunks = body.split(/\n---\n/).map((c) => c.trim()).filter(Boolean);
  return chunks
    .map((chunk, idx) => {
      const html = markdownToHtml(chunk);
      return `<section class="slide"><div class="brand">isteBul</div>${html}<div class="slide-num">${idx + 1} / ${chunks.length}</div></section>`;
    })
    .join('\n');
}

function buildOnePagerHtml(root) {
  const md = readDoc(root, 'docs/investor/ONE_PAGER.md');
  return wrapReport({
    title: 'Investor One-Pager',
    subtitle: 'isteBul — Karar altyapısı · Pre-seed / Seed',
    bodyHtml: markdownToHtml(md)
  });
}

function buildExecutiveReportHtml(root) {
  const parts = [
    { file: 'docs/investor/INVESTOR_NARRATIVE.md', title: 'Yatırımcı anlatısı' },
    { file: 'docs/investor/KPI_STORY.md', title: 'KPI hikâyesi' },
    { file: 'docs/investor/MONETIZATION_STORY.md', title: 'Monetizasyon' },
    { file: 'docs/investor/MARKET_SIZING.md', title: 'Pazar büyüklüğü' },
    { file: 'docs/investor/MOAT_ARTICULATION.md', title: 'Moat' },
    { file: 'docs/investor/UNIT_ECONOMICS.md', title: 'Birim ekonomi' },
    { file: 'docs/investor/RISK_REGISTER.md', title: 'Riskler' }
  ];
  const sections = parts
    .filter((p) => fs.existsSync(path.join(root, p.file)))
    .map((p) => {
      const md = readDoc(root, p.file);
      return `<h2>${escapeHtml(p.title)}</h2>${markdownToHtml(md)}`;
    })
    .join('\n<hr>\n');

  return wrapReport({
    title: 'Investor Executive Report',
    subtitle: 'Due diligence özet paketi — narrative, KPI, pazar, moat, risk',
    bodyHtml: sections
  });
}

function buildOperationsGuideHtml(root) {
  const md = readDoc(root, 'docs/investor/FOUNDER_FUNDRAISING_MASTER_GUIDE.md');
  return wrapReport({
    title: 'Kurucu Fundraising Rehberi',
    subtitle: 'İletişim · anlatım · toplantı · aksiyon planı',
    bodyHtml: markdownToHtml(md)
  });
}

function buildPitchDeckHtml(root) {
  const md = readDoc(root, 'docs/investor/investor-deck.md');
  return wrapSlides(deckSlidesFromMarkdown(md));
}

function buildFundraisingReadinessHtml(root) {
  const md = readDoc(root, 'docs/investor/FUNDRAISING_READINESS.md');
  return wrapReport({
    title: 'Fundraising Readiness Report',
    subtitle: 'Hazır varlıklar · eksikler · export komutları',
    bodyHtml: markdownToHtml(md)
  });
}

function writeExportBundle(root, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const files = {
    'one-pager.html': buildOnePagerHtml(root),
    'pitch-deck-slides.html': buildPitchDeckHtml(root),
    'executive-report.html': buildExecutiveReportHtml(root),
    'fundraising-readiness-report.html': buildFundraisingReadinessHtml(root),
    'founder-master-guide.html': buildOperationsGuideHtml(root)
  };
  for (const [name, html] of Object.entries(files)) {
    fs.writeFileSync(path.join(outDir, name), html, 'utf8');
  }
  return files;
}

module.exports = {
  writeExportBundle,
  buildOnePagerHtml,
  buildPitchDeckHtml,
  buildExecutiveReportHtml,
  buildOperationsGuideHtml,
  buildFundraisingReadinessHtml
};
