import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildReportHtml,
  downloadDecisionReport,
  sanitizeReportText,
  formatReportMoney,
  formatReportScore,
  createReportFilename
} = await import('../../js/features/results/pdf-report.js');

const samplePayload = {
  category: 'konut',
  generatedAt: '2026-05-29T10:00:00.000Z',
  decisionScore: 78,
  scoreLabel: 'Uygun',
  confidenceScore: 82,
  overallRisk: 'Orta',
  executiveSummary: 'Konut alımı koşullu olarak değerlendirilebilir.',
  riskAnalysis: [
    {
      key: 'budget',
      title: 'Bütçe riski',
      level: 'orta',
      description: 'Aylık yük dengeli.',
      recommendation: 'Senaryo tablosu çıkarın.'
    }
  ],
  totalCost: {
    isEstimate: true,
    estimateNote: 'Tahmini model',
    downPayment: 500_000,
    monthlyPayment: 42_000,
    firstYearTotal: 1_004_000
  },
  strengths: ['Lokasyon uyumu'],
  weaknesses: ['Faiz oynaklığı'],
  alternatives: [{ title: 'Kiralama', description: 'Esnek nakit' }],
  nextSteps: ['Banka ön onayı alın']
};

test('buildReportHtml includes brand header', () => {
  const html = buildReportHtml(samplePayload);
  assert.match(html, /isteBul/);
  assert.match(html, /AI destekli karar analizi/);
});

test('buildReportHtml renders decision score', () => {
  const html = buildReportHtml(samplePayload);
  assert.match(html, /Karar Skoru/);
  assert.match(html, /78\/100/);
  assert.match(html, /Uygun/);
});

test('buildReportHtml renders risk analysis section', () => {
  const html = buildReportHtml(samplePayload);
  assert.match(html, /Risk Analizi/);
  assert.match(html, /Bütçe riski/);
  assert.match(html, /Senaryo tablosu/);
});

test('buildReportHtml renders cost fields', () => {
  const html = buildReportHtml(samplePayload);
  assert.match(html, /Toplam Maliyet/);
  assert.match(html, /Peşinat/);
  assert.match(html, /Aylık ödeme/);
});

test('sanitizeReportText strips HTML injection', () => {
  const clean = sanitizeReportText('<img src=x onerror=alert(1)><script>bad()</script>metin');
  assert.ok(!clean.includes('<script'));
  assert.ok(!clean.includes('<img'));
  assert.match(clean, /metin/);
});

test('createReportFilename builds safe category date filename', () => {
  const name = createReportFilename('konut', '2026-05-29T12:00:00Z');
  assert.equal(name, 'istebul-konut-karar-raporu-2026-05-29.pdf');
  assert.ok(!name.includes(' '));
  assert.ok(!name.includes('<'));
});

test('buildReportHtml does not crash on empty pdfReportData', () => {
  assert.doesNotThrow(() => {
    const html = buildReportHtml();
    assert.match(html, /isteBul/);
    assert.match(html, /Yönetici özeti/);
    assert.match(html, /Karar gerekçeleri/);
  });
});

test('buildReportHtml includes disclaimer', () => {
  const html = buildReportHtml(samplePayload);
  assert.match(html, /karar destek amaçlıdır/);
  assert.match(html, /yatırım tavsiyesi değildir/);
});

test('formatReportMoney and formatReportScore helpers', () => {
  assert.match(formatReportMoney(125000), /125/);
  assert.equal(formatReportScore(88, 'Çok uygun'), '88/100 (Çok uygun)');
});

test('downloadDecisionReport returns safely without window', () => {
  const result = downloadDecisionReport(samplePayload);
  assert.equal(result.ok, false);
  assert.equal(result.method, 'no-window');
  assert.match(result.filename, /\.pdf$/);
});
