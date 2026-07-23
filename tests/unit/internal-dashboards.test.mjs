import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildInternalDashboardContext } from '../../js/features/dashboards/internal-dashboard-context.js';
import { renderInternalDashboard } from '../../js/features/dashboards/internal-dashboard-views.js';

const esc = (s) => String(s);

describe('internal-dashboards', () => {
  it('buildInternalDashboardContext returns p14 structure', () => {
    const ctx = buildInternalDashboardContext({
      analyticsEvents: [
        { event_name: 'landing_visit', created_at: new Date().toISOString() },
        { event_name: 'lead_submit', created_at: new Date().toISOString() }
      ],
      subscriptions: [{ status: 'active', cancel_at_period_end: false }],
      autoLeads: [{ lead_score: 80, partner_status: 'won', created_at: new Date().toISOString() }]
    });
    assert.equal(ctx.version, 'p14.0');
    assert.ok(ctx.executive);
    assert.ok(ctx.growth);
    assert.ok(ctx.revenue);
    assert.ok(ctx.partnerOps);
    assert.ok(ctx.support);
  });

  it('renderInternalDashboard outputs CEO section', () => {
    const ctx = buildInternalDashboardContext({
      analyticsEvents: [{ event_name: 'page_view', created_at: new Date().toISOString() }]
    });
    const html = renderInternalDashboard('ceo', ctx, esc);
    assert.match(html, /CEO Özeti · Son/);
    assert.match(html, /CEO sağlığı/);
    assert.match(html, /CEO özeti/);
    assert.doesNotMatch(html, /Executive summary/);
  });

  it('operation and analytics CTA labels stay aligned with nav labels', () => {
    const ctx = buildInternalDashboardContext({
      analyticsEvents: [{ event_name: 'page_view', created_at: new Date().toISOString() }]
    });
    const ceoHtml = renderInternalDashboard('ceo', ctx, esc);
    const growthHtml = renderInternalDashboard('growth', ctx, esc);
    const revenueHtml = renderInternalDashboard('revenue', ctx, esc);
    const partnerHtml = renderInternalDashboard('partner_ops', ctx, esc);
    const supportHtml = renderInternalDashboard('support', ctx, esc);
    const combined = `${ceoHtml}${growthHtml}${revenueHtml}${partnerHtml}${supportHtml}`;

    assert.match(combined, />Yatırımcı KPI</);
    assert.match(combined, />Operasyon Komuta Merkezi</);
    assert.match(combined, />Platform analitik</);
    assert.match(combined, />Auto analitik</);
    assert.match(combined, />Gözlemlenebilirlik</);
    assert.match(combined, />Teslimat logları</);
    assert.match(combined, />Partner kanalları</);
    assert.match(combined, />Auto leadler</);
    assert.match(combined, />SSS yönetimi</);
    assert.doesNotMatch(combined, /Executive KPIs(?: \(detail\))?/);
    assert.doesNotMatch(combined, />Ops Command Center</);
    assert.doesNotMatch(combined, />Platform Analytics</);
    assert.doesNotMatch(combined, />Auto Analytics</);
    assert.doesNotMatch(combined, />Observability</);
    assert.doesNotMatch(combined, />Dispatch Logs</);
    assert.doesNotMatch(combined, />Partner Channels</);
    assert.doesNotMatch(combined, />Auto Leads</);
  });

  it('TR-2b internal dashboard dynamic copy uses Turkish labels', () => {
    const ctx = buildInternalDashboardContext({
      analyticsEvents: [{ event_name: 'page_view', created_at: new Date().toISOString() }]
    });
    const ceoHtml = renderInternalDashboard('ceo', ctx, esc);
    const growthHtml = renderInternalDashboard('growth', ctx, esc);
    const revenueHtml = renderInternalDashboard('revenue', ctx, esc);
    const partnerHtml = renderInternalDashboard('partner_ops', ctx, esc);
    const supportHtml = renderInternalDashboard('support', ctx, esc);

    assert.match(ceoHtml, /Huni CR/);
    assert.match(ceoHtml, /Ücretli dönüşümler/);
    assert.match(ceoHtml, /Partner teslimatı/);
    assert.match(ceoHtml, /Geri kazanım oranı/);
    assert.match(ceoHtml, /aktif abonelik/);

    assert.match(growthHtml, /Büyüme komuta merkezi · 7g huni/);
    assert.match(growthHtml, /Nitelikli leadler \(7g\)/);
    assert.match(growthHtml, /7 günlük huni/);
    assert.match(growthHtml, /En iyi kanallar/);
    assert.match(growthHtml, /<th>Kanal<\/th><th>Olaylar<\/th><th>Leadler<\/th>/);

    const growthEmptyHtml = renderInternalDashboard('growth', buildInternalDashboardContext({}), esc);
    assert.match(growthEmptyHtml, /Kanal verisi yok/);

    assert.match(revenueHtml, /Gelir &amp; faturalama · RevOps otomasyonları aktif/);
    assert.match(revenueHtml, /Kayıp sinyali/);
    assert.match(revenueHtml, /abonelik dönem sonunda iptal/);
    assert.match(revenueHtml, /İlişkilendirilen gelir/);
    assert.match(revenueHtml, /Lead pipeline \(monetizasyon\)/);

    assert.match(partnerHtml, /Partner ops sağlığı/);
    assert.match(partnerHtml, /Teslimat başarısı \(24s\)/);
    assert.match(partnerHtml, /Şimdi yeniden denenecekler/);
    assert.match(partnerHtml, /Sağlıksız uç noktalar/);

    assert.match(supportHtml, /Müşteri &amp; destek ops · P11 iş akışları/);
    assert.match(supportHtml, /SSS makaleleri \(CMS\)/);
    assert.match(supportHtml, /Destek iş akışları \(manifest\)/);
    assert.match(supportHtml, /<th>Kimlik<\/th><th>Ad<\/th><th>İşleyici \/ akış<\/th>/);

    const combined = `${ceoHtml}${growthHtml}${revenueHtml}${partnerHtml}${supportHtml}`;
    assert.doesNotMatch(combined, /Growth command center/);
    assert.doesNotMatch(combined, /7-day funnel/);
    assert.doesNotMatch(combined, />Top channels/);
    assert.doesNotMatch(combined, /Revenue &amp; billing/);
    assert.doesNotMatch(combined, />Churn signal</);
    assert.doesNotMatch(combined, />Partner ops health</);
    assert.doesNotMatch(combined, />Support workflows \(manifest\)/);
  });

  it('TR-2b-4 internal dashboard funnel and executive display uses Turkish copy', () => {
    const ctx = buildInternalDashboardContext({
      analyticsEvents: [
        { event_name: 'landing_visit', created_at: new Date().toISOString() },
        { event_name: 'auto_wizard_complete', created_at: new Date().toISOString() },
        { event_name: 'checkout_started', created_at: new Date().toISOString() },
        { event_name: 'paid_conversion', created_at: new Date().toISOString() }
      ],
      subscriptions: [{ status: 'active', cancel_at_period_end: false }]
    });

    const ceoHtml = renderInternalDashboard('ceo', ctx, esc);
    const growthHtml = renderInternalDashboard('growth', ctx, esc);
    const revenueHtml = renderInternalDashboard('revenue', ctx, esc);
    const partnerHtml = renderInternalDashboard('partner_ops', ctx, esc);
    const supportHtml = renderInternalDashboard('support', ctx, esc);
    const combined = `${ceoHtml}${growthHtml}${revenueHtml}${partnerHtml}${supportHtml}`;

    assert.match(growthHtml, /İniş:/);
    assert.match(growthHtml, /Wizard tamamlama:/);
    assert.match(growthHtml, /Checkout başlangıç:/);
    assert.match(growthHtml, /Ücretli dönüşüm:/);
    assert.match(growthHtml, /dönüşüm/);
    assert.match(growthHtml, /etkileşim/);
    assert.match(growthHtml, /iniş→lead/);

    assert.match(revenueHtml, /Tahmini pipeline/);
    assert.match(revenueHtml, /Gerçekleşen pipeline/);
    assert.match(revenueHtml, /Kazanma oranı/);
    assert.match(revenueHtml, /faturalanabilir/);
    assert.match(revenueHtml, /kurtarma akışı kayıtlı/);

    assert.match(partnerHtml, /Partner teslimat ops/);
    assert.match(partnerHtml, /CRM teslimat oranı/);
    assert.match(partnerHtml, /Partner kazanma oranı/);
    assert.match(partnerHtml, /Pasif partnerler/);
    assert.match(partnerHtml, /deneme/);

    assert.match(supportHtml, /Geri kazanım oranı/);
    assert.match(supportHtml, /elde tutma vekili/);
    assert.match(supportHtml, /aktif/);

    assert.doesNotMatch(combined, /Wizard complete:/);
    assert.doesNotMatch(combined, /Checkout start:/);
    assert.doesNotMatch(combined, /Paid conversion:/);
    assert.doesNotMatch(combined, />Partner win rate</);
    assert.doesNotMatch(combined, />Pipeline realized</);
    assert.doesNotMatch(combined, />SLA breach</);
    assert.doesNotMatch(combined, />Inactive partners</);
    assert.doesNotMatch(combined, />Recovery rate</);
    assert.doesNotMatch(combined, /Load support-workflows\.json/);
  });
});
