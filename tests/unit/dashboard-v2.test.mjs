import test from 'node:test';
import assert from 'node:assert/strict';

const store = await import('../../js/features/account/dashboard-v2-store.js');
const { buildDashboardV2Data, renderDashboardV2, renderDashboardV2Guest } = await import(
  '../../js/features/account/dashboard-v2.js'
);

test('normalizeDashboardCategory maps aliases', () => {
  assert.equal(store.normalizeDashboardCategory('arac'), 'auto');
  assert.equal(store.normalizeDashboardCategory('finans'), 'finansman');
  assert.equal(store.normalizeDashboardCategory('housing'), 'konut');
});

test('recordPdfReportHistory and list roundtrip', () => {
  const uid = `test_${Date.now()}`;
  store.recordPdfReportHistory(
    { category: 'auto', decisionScore: 80, overallRisk: 'Orta', executiveSummary: 'Test' },
    uid
  );
  const list = store.listPdfReportHistory(uid);
  assert.ok(list.length >= 1);
  assert.equal(list[0].category, 'auto');
  assert.equal(list[0].decisionScore, 80);
});

test('compare selection add and remove', () => {
  const uid = `cmp_${Date.now()}`;
  store.addAnalysisToCompareSelection(
    { id: 'a1', category: 'konut', title: 'Test', decisionScore: 70 },
    uid
  );
  let list = store.listCompareSelections(uid);
  assert.equal(list.length, 1);
  store.removeCompareSelection('a1', uid);
  list = store.listCompareSelections(uid);
  assert.equal(list.length, 0);
});

test('buildDashboardV2Data empty state', () => {
  const data = buildDashboardV2Data({ userId: 'u_empty', history: [], favorites: [], hasPremium: false });
  assert.equal(data.isEmpty, true);
  assert.ok(data.summary);
});

test('renderDashboardV2 includes score sections', () => {
  const html = renderDashboardV2({
    user: { email: 'a@test.com' },
    profile: { full_name: 'Test' },
    hasPremium: false,
    summary: { totalAnalyses: 1, lastPdfLabel: '—', favoritesCount: 0, openDecisions: 0, proLabel: 'Ücretsiz' },
    recentAnalyses: [
      {
        id: '1',
        category: 'auto',
        categoryLabel: 'Araç',
        decisionScore: 85,
        riskLevel: 'Düşük',
        dateLabel: '1 Oca',
        href: '/auto/',
        summary: 'Özet'
      }
    ],
    pdfReports: [],
    favoritesGrouped: { auto: [], konut: [], tatil: [], finansman: [] },
    compareQueue: [],
    isEmpty: false
  });
  assert.match(html, /Karar skoru/);
  assert.match(html, /PDF rapor geçmişi/);
  assert.match(html, /Karşılaştırmaya ekle/);
});

test('renderDashboardV2Guest shows login CTA', () => {
  const html = renderDashboardV2Guest();
  assert.match(html, /account-login-btn/);
  assert.match(html, /Araç Analizi/);
});
