#!/usr/bin/env node
'use strict';

/**
 * Export investor PDF pack (one-pager, pitch deck slides, executive report, guides).
 * Usage: npm run investor:export:pdf
 * Output: docs/investor/export/*.pdf + *.html
 */

const fs = require('fs');
const path = require('path');
const { writeExportBundle } = require('./lib/investor-export-html.cjs');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'docs', 'investor', 'export');

const PDF_JOBS = [
  { html: 'one-pager.html', pdf: 'isteBul_ONE_PAGER.pdf', landscape: false },
  { html: 'pitch-deck-slides.html', pdf: 'isteBul_PITCH_DECK.pdf', landscape: true },
  { html: 'executive-report.html', pdf: 'isteBul_EXECUTIVE_REPORT.pdf', landscape: false },
  { html: 'fundraising-readiness-report.html', pdf: 'isteBul_FUNDRAISING_READINESS.pdf', landscape: false },
  { html: 'founder-master-guide.html', pdf: 'isteBul_FOUNDER_FUNDRAISING_GUIDE.pdf', landscape: false }
];

async function exportPdfsWithPlaywright() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  for (const job of PDF_JOBS) {
    const filePath = path.join(outDir, job.html);
    if (!fs.existsSync(filePath)) {
      console.warn(`skip pdf (missing html): ${job.html}`);
      continue;
    }
    const page = await context.newPage();
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle' });
    const pdfPath = path.join(outDir, job.pdf);
    await page.pdf({
      path: pdfPath,
      printBackground: true,
      landscape: job.landscape,
      preferCSSPageSize: true,
      margin: job.landscape ? { top: 0, right: 0, bottom: 0, left: 0 } : undefined
    });
    await page.close();
    console.log(`wrote ${job.pdf}`);
  }

  await browser.close();
}

function writeReadme() {
  const readme = `# isteBul Investor Export Pack

Generated: ${new Date().toISOString()}

## PDF dosyaları (yatırımcıya gönder)

| Dosya | Kullanım |
|-------|----------|
| \`isteBul_ONE_PAGER.pdf\` | İlk temas, intro mail eki |
| \`isteBul_PITCH_DECK.pdf\` | 1. ve 2. görüşme sunumu (16:9 slayt) |
| \`isteBul_EXECUTIVE_REPORT.pdf\` | DD öncesi özet rapor |
| \`isteBul_FUNDRAISING_READINESS.pdf\` | İç hazırlık / eksik listesi |
| \`isteBul_FOUNDER_FUNDRAISING_GUIDE.pdf\` | Kurucu operasyon rehberi (iletişim + süreç) |

## HTML (düzenleme / yeniden export)

HTML dosyalarını düzenledikten sonra: \`npm run investor:export:pdf\` (önce: \`npx playwright install chromium\`)

## Canlı metrik

Toplantı öncesi: \`npm run metrics:investor:pack\` → \`dist/investor-readiness-pack.json\`

## Google Slides / Keynote

1. \`docs/investor/investor-deck.md\` dosyasını Marp veya manuel olarak slaytlara aktarın
2. Veya \`pitch-deck-slides.html\` → tarayıcıdan PDF → slayt görseli olarak import
`;
  fs.writeFileSync(path.join(outDir, 'README.md'), readme, 'utf8');
}

async function main() {
  const guidePath = path.join(root, 'docs/investor/FOUNDER_FUNDRAISING_MASTER_GUIDE.md');
  if (!fs.existsSync(guidePath)) {
    console.error('Missing FOUNDER_FUNDRAISING_MASTER_GUIDE.md — run docs generation first.');
    process.exit(1);
  }

  console.log('Building HTML bundle...');
  writeExportBundle(root, outDir);
  writeReadme();

  console.log('Exporting PDFs with Playwright...');
  try {
    await exportPdfsWithPlaywright();
  } catch (err) {
    console.error('PDF export failed:', err.message);
    console.error('HTML files are in docs/investor/export/. Install browsers: npx playwright install chromium');
    process.exit(1);
  }

  console.log(`Done → ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
