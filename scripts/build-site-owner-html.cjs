#!/usr/bin/env node
/**
 * Builds print-friendly HTML from docs/site-owner/ISTEBUL-SITE-SAHIBI-TAM-PAKET.md
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mdPath = path.join(root, 'docs/site-owner/ISTEBUL-SITE-SAHIBI-TAM-PAKET.md');
const outPath = path.join(root, 'docs/site-owner/ISTEBUL-SITE-SAHIBI-TAM-PAKET.html');

async function main() {
  const { marked } = await import('marked');
  const md = fs.readFileSync(mdPath, 'utf8');
  const body = marked.parse(md, { gfm: true, breaks: false });
  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>isteBul — Site sahibi tam paket</title>
  <style>
    :root { --text: #111827; --muted: #4b5563; --accent: #2563eb; --border: #e5e7eb; }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      color: var(--text);
      max-width: 820px;
      margin: 0 auto;
      padding: 24px 32px 48px;
    }
    h1 { font-size: 22pt; border-bottom: 2px solid var(--accent); padding-bottom: 8px; }
    h2 { font-size: 15pt; margin-top: 1.6em; color: var(--accent); page-break-after: avoid; }
    h3 { font-size: 12pt; margin-top: 1.2em; page-break-after: avoid; }
    p, li { orphans: 3; widows: 3; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
    th, td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; }
    code { background: #f3f4f6; padding: 2px 5px; border-radius: 4px; font-size: 9.5pt; }
    blockquote { border-left: 4px solid var(--accent); margin: 12px 0; padding: 8px 16px; color: var(--muted); background: #f9fafb; }
    hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
    .print-hint {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 10pt;
    }
    @media print {
      .print-hint { display: none; }
      body { padding: 0; max-width: none; }
      a { color: inherit; text-decoration: none; }
      h2 { page-break-before: auto; }
    }
  </style>
</head>
<body>
  <div class="print-hint">
    <strong>PDF indirmek için:</strong> Tarayıcı menüsü → Yazdır (Ctrl+P / Cmd+P) → Hedef: <em>PDF olarak kaydet</em>.
    Güncel Markdown: <code>ISTEBUL-SITE-SAHIBI-TAM-PAKET.md</code>
  </div>
  ${body}
</body>
</html>`;
  fs.writeFileSync(outPath, html, 'utf8');
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
