import test from 'node:test';
import assert from 'node:assert/strict';

const { renderPremiumDecisionDashboard, escapeDashboardHtml } = await import(
  '../../js/ui/components/premium-decision-dashboard.js'
);

test('escapeDashboardHtml encodes HTML', () => {
  assert.equal(escapeDashboardHtml('<script>'), '&lt;script&gt;');
});

test('renderPremiumDecisionDashboard includes standard blocks', () => {
  const html = renderPremiumDecisionDashboard({
    category: 'finans',
    decisionScore: 88,
    totalCostLabel: '₺1.2M',
    riskLabel: 'Düşük',
    aiSummary: 'Test yorumu',
    nextStep: 'Teklif alın',
    advantages: ['Avantaj 1'],
    cautions: ['Dikkat 1']
  });
  assert.match(html, /Karar Skoru/);
  assert.match(html, /Toplam Maliyet/);
  assert.match(html, /Risk Analizi/);
  assert.match(html, /Avantajlar/);
  assert.match(html, /Dikkat Edilecekler/);
  assert.match(html, /AI Yorumu/);
  assert.match(html, /Sonraki Adımlar/);
  assert.match(html, /88/);
});
