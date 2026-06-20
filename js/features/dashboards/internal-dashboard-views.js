/**
 * P14 — HTML renderers for internal company dashboards.
 */

/**
 * P14 — HTML renderers for internal company dashboards.
 */

const FUNNEL_STEP_LABEL_TR = Object.freeze({
  landing_visit: 'İniş',
  hero_cta_click: 'Hero CTA',
  auto_start: 'Auto başlangıç',
  wizard_complete: 'Wizard tamamlama',
  results_view: 'Sonuçlar',
  lead_submit: 'Lead',
  pricing_view: 'Fiyatlandırma',
  checkout_start: 'Checkout başlangıç',
  checkout_complete: 'Checkout tamamlandı',
  paid_conversion: 'Ücretli dönüşüm'
});

const FUNNEL_STEP_LABEL_FALLBACK_TR = Object.freeze({
  Landing: 'İniş',
  'Hero CTA': 'Hero CTA',
  'Auto start': 'Auto başlangıç',
  'Wizard complete': 'Wizard tamamlama',
  Results: 'Sonuçlar',
  Lead: 'Lead',
  Pricing: 'Fiyatlandırma',
  'Checkout start': 'Checkout başlangıç',
  'Checkout complete': 'Checkout tamamlandı',
  'Paid conversion': 'Ücretli dönüşüm'
});

const INTERNAL_HEALTH_TR = Object.freeze({
  healthy: 'sağlıklı',
  warning: 'uyarı',
  warn: 'uyarı',
  critical: 'kritik',
  error: 'hata',
  ok: 'tamam'
});

const INTERNAL_SEVERITY_TR = Object.freeze({
  critical: 'Kritik',
  error: 'Hata',
  warning: 'Uyarı',
  info: 'Bilgi'
});

const INTERNAL_ALERT_MESSAGE_TR = Object.freeze({
  'Conversion crash — funnel CR dropped sharply vs prior 24h. Check CRO, landing, and auto wizard.':
    'Dönüşüm çöküşü — huni CR önceki 24 saate göre keskin düştü. CRO, landing ve auto wizard’ı kontrol edin.',
  'Checkout failures elevated — review Stripe checkout, payment errors, and abandon recovery.':
    'Checkout hataları yükseldi — Stripe checkout, ödeme hataları ve terk kurtarmayı inceleyin.',
  'Stripe webhook failures detected — verify signature secret, endpoint uptime, and Cloudflare worker logs.':
    'Stripe webhook hataları tespit edildi — imza secret, uç nokta çalışma süresi ve Cloudflare worker loglarını doğrulayın.',
  'Partner dispatch failures elevated — run partner-retry and check endpoint health.':
    'Partner teslimat hataları yükseldi — partner-retry çalıştırın ve uç nokta sağlığını kontrol edin.',
  'Unusual churn signal — multiple cancel-at-period-end or churn event spike. Trigger retention outreach.':
    'Olağandışı churn sinyali — birden fazla dönem sonu iptali veya churn artışı. Elde tutma iletişimini tetikleyin.',
  'Lead volume anomaly — lead submits dropped vs prior 24h. Check acquisition, SEO, and form health.':
    'Lead hacmi anomalisi — lead gönderimleri önceki 24 saate göre düştü. Edinim, SEO ve form sağlığını kontrol edin.',
  'Analytics volume anomaly — event ingest may be broken or traffic collapsed. Check analytics-ingest and CDN.':
    'Analitik hacim anomalisi — olay alımı bozulmuş veya trafik çökmüş olabilir. analytics-ingest ve CDN’i kontrol edin.',
  'Partner webhook/dispatch failures elevated — run partner-retry workflow.':
    'Partner webhook/teslimat hataları yükseldi — partner-retry iş akışını çalıştırın.',
  'Lead dispatch success rate below 70% — check partner endpoints and HMAC secrets.':
    'Lead teslimat başarı oranı %70 altında — partner uç noktalarını ve HMAC secret’larını kontrol edin.'
});

function formatFunnelStepLabel(step) {
  const key = String(step?.key || '').toLowerCase();
  if (key && FUNNEL_STEP_LABEL_TR[key]) return FUNNEL_STEP_LABEL_TR[key];
  const label = String(step?.label || step || '');
  return FUNNEL_STEP_LABEL_FALLBACK_TR[label] || label;
}

function formatInternalHealthLabel(value) {
  const key = String(value || '').toLowerCase();
  return INTERNAL_HEALTH_TR[key] || value;
}

function formatInternalSeverityLabel(value) {
  const key = String(value || '').toLowerCase();
  return INTERNAL_SEVERITY_TR[key] || value;
}

function formatInternalAlertMessage(message) {
  return INTERNAL_ALERT_MESSAGE_TR[message] || message;
}

function formatCeoSummaryLine(line) {
  let out = String(line || '');
  const phrases = [
    ['partner win rate', 'partner kazanma oranı'],
    ['Landing→paid', 'İniş→ücretli'],
    ['(north star)', '(kuzey yıldızı)']
  ];
  for (const [from, to] of phrases) {
    out = out.replace(from, to);
  }
  return out;
}

function fmtPct(v) {
  return v == null ? '—' : `${v}%`;
}

function healthClass(health) {
  if (health === 'critical' || health === 'error') return 'ib-dash-health--crit';
  if (health === 'warning' || health === 'warn') return 'ib-dash-health--warn';
  return 'ib-dash-health--ok';
}

/**
 * @param {Array<{ label: string, value: string|number, sub?: string }>} cards
 */
export function renderStatGrid(cards, escapeHtml) {
  return `<div class="stat-grid">${cards
    .map(
      (c) => `
    <div class="stat-card">
      <div class="stat-label">${escapeHtml(c.label)}</div>
      <div class="stat-value">${escapeHtml(String(c.value))}</div>
      ${c.sub ? `<div class="stat-sub">${escapeHtml(c.sub)}</div>` : ''}
    </div>`
    )
    .join('')}</div>`;
}

/**
 * @param {string} kind ceo|growth|revenue|partner_ops|support
 * @param {object} ctx from buildInternalDashboardContext
 * @param {function} escapeHtml
 */
export function renderInternalDashboard(kind, ctx, escapeHtml) {
  switch (kind) {
    case 'ceo':
      return renderCeoDashboard(ctx, escapeHtml);
    case 'growth':
      return renderGrowthDashboard(ctx, escapeHtml);
    case 'revenue':
      return renderRevenueDashboard(ctx, escapeHtml);
    case 'partner_ops':
      return renderPartnerOpsDashboard(ctx, escapeHtml);
    case 'support':
      return renderSupportDashboard(ctx, escapeHtml);
    default:
      return '<p class="empty">Bilinmeyen dashboard.</p>';
  }
}

function renderCeoDashboard(ctx, escapeHtml) {
  const ex = ctx.executive;
  const ceo = ctx.ceoAlerts;
  const c = ex.conversions.counts;

  return `
    <p class="ib-dash-muted">CEO Özeti · Son ${ctx.windowDays} gün · ${ctx.sampleSize.analyticsEvents} analytics · Export: <code>npm run metrics:executive</code> · <code>npm run ceo:alerts:run</code></p>

    <div class="ib-dash-health ${healthClass(ceo.overallHealth)}">
      <p class="ib-dash-kicker">CEO sağlığı</p>
      <strong>${escapeHtml(formatInternalHealthLabel(ceo.overallHealth))}</strong>
      <span class="text-muted-sm"> · ${ceo.alerts.triggeredCount} erken müdahale uyarısı</span>
      ${
        ceo.alerts.triggered.length
          ? `<ul class="ib-dash-alert-list">${ceo.alerts.triggered
              .map(
                (a) =>
                  `<li><strong>${escapeHtml(formatInternalSeverityLabel(a.severity))}</strong> — ${escapeHtml(formatInternalAlertMessage(a.message))}</li>`
              )
              .join('')}</ul>`
          : '<p class="text-muted-sm" style="margin:8px 0 0">Pencerede CEO eşik uyarısı yok.</p>'
      }
    </div>

    <div class="ib-dash-section">
      <h3>CEO özeti</h3>
      <ul class="ib-dash-alert-list">${ex.ceoSummary.map((line) => `<li>${escapeHtml(formatCeoSummaryLine(line))}</li>`).join('')}</ul>
    </div>

    ${renderStatGrid(
      [
        { label: 'MRR', value: `${ex.revenue.mrrTry.toLocaleString('tr-TR')} ₺`, sub: `${ex.churn.activeSubscriptions} aktif abonelik` },
        { label: 'Huni CR', value: fmtPct(ex.conversions.funnelConversionPct), sub: `${c.leads} / ${c.landing} lead` },
        { label: 'Ücretli dönüşümler', value: c.paid, sub: fmtPct(ex.conversions.paidConversionPct) },
        { label: 'Partner teslimatı', value: fmtPct(ex.partnerLeadQuality.dispatchRatePct), sub: `${ex.partnerLeadQuality.totalLeads} CRM lead` },
        { label: 'Gerçekleşen pipeline', value: `${ex.pipeline.actualTry.toLocaleString('tr-TR')} ₺`, sub: `tahmini ${ex.pipeline.estimatedTry.toLocaleString('tr-TR')} ₺` },
        { label: 'Geri kazanım oranı', value: fmtPct(ex.retention.recoveryRatePct), sub: `${ex.retention.lifecycleEnrolls} lifecycle kayıt` }
      ],
      escapeHtml
    )}

    <div class="ib-dash-links">
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="investor-metrics">Yatırımcı KPI</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="ops-command-center">Operasyon Komuta Merkezi</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="observability">Gözlemlenebilirlik</button>
    </div>
  `;
}

function renderGrowthDashboard(ctx, escapeHtml) {
  const g = ctx.growth;
  const ns = g.northStar7d;

  const funnelHtml = g.funnel7d.steps
    .map(
      (s) =>
        `<span class="ib-dash-funnel-step">${escapeHtml(formatFunnelStepLabel(s))}: <strong>${s.count}</strong>${s.stepCrPct != null ? ` (${s.stepCrPct}%)` : ''}</span>`
    )
    .join('<span aria-hidden="true"> → </span>');

  const channelRows = g.channels
    .map(
      (ch) => `
      <tr>
        <td>${escapeHtml(ch.channel)}</td>
        <td>${ch.events}</td>
        <td>${ch.leads}</td>
        <td>${ch.checkouts}</td>
        <td>${ch.paid}</td>
      </tr>`
    )
    .join('');

  return `
    <p class="ib-dash-muted">Büyüme komuta merkezi · 7g huni + ${ctx.windowDays}g kanallar · <code>npm run metrics:growth:command</code></p>

    ${renderStatGrid(
      [
        { label: 'Nitelikli leadler (7g)', value: ns.qualifiedLeads, sub: `iniş→lead ${ns.landingToLeadPct ?? '—'}%` },
        { label: 'Ücretli (7g)', value: ns.paidConversions, sub: `checkout CR ${ns.checkoutCrPct ?? '—'}%` },
        { label: 'Deney gösterimleri', value: g.experiments.exposures, sub: `${g.experiments.conversions} dönüşüm` },
        { label: 'Ücretli tıklama yakalama', value: g.paid.clickCapture, sub: `${g.paid.conversionSignals} sinyal` },
        { label: 'Geri dönüş ziyaretleri', value: g.retention.returnVisits, sub: `${g.retention.engagementEvents} etkileşim` },
        { label: 'Lifecycle kayıtları', value: g.retention.lifecycleEnrolls, sub: `geri kazanım ${g.retention.recoveryRatePct ?? '—'}%` }
      ],
      escapeHtml
    )}

    <div class="ib-dash-section">
      <h3>7 günlük huni</h3>
      <div class="ib-dash-funnel">${funnelHtml}</div>
    </div>

    <div class="ib-dash-section">
      <h3>En iyi kanallar (${ctx.windowDays}g)</h3>
      <div class="ib-dash-table-wrap">
        <table class="table">
          <thead><tr><th>Kanal</th><th>Olaylar</th><th>Leadler</th><th>Checkout</th><th>Ücretli</th></tr></thead>
          <tbody>${channelRows || '<tr><td colspan="5" class="empty">Kanal verisi yok</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div class="ib-dash-links">
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="platform-analytics">Platform analitik</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="auto-analytics">Auto analitik</button>
    </div>
  `;
}

function renderRevenueDashboard(ctx, escapeHtml) {
  const r = ctx.revenue;
  const c = r.conversions.counts;
  const sig = r.revOpsSignals;

  return `
    <p class="ib-dash-muted">Gelir &amp; faturalama · RevOps otomasyonları aktif · <code>npm run metrics:executive</code></p>

    <div class="ib-dash-health ${healthClass(sig.cancelAtPeriodEnd >= 3 ? 'warning' : 'ok')}">
      <p class="ib-dash-kicker">Kayıp sinyali</p>
      <strong>${sig.cancelAtPeriodEnd}</strong> abonelik dönem sonunda iptal
      · Stripe webhook hataları (24s): <strong>${ctx.ops.stripeWebhookFails24h}</strong>
    </div>

    ${renderStatGrid(
      [
        { label: 'MRR', value: `${r.mrrTry.toLocaleString('tr-TR')} ₺`, sub: `ARR ${r.arrTry.toLocaleString('tr-TR')} ₺` },
        { label: 'ARPU', value: `${r.arpuTry.toLocaleString('tr-TR')} ₺`, sub: `${r.churn.activeSubscriptions} faturalanabilir` },
        { label: 'İlişkilendirilen gelir', value: `${r.attributedRevenueTry.toLocaleString('tr-TR')} ₺`, sub: 'analitik ilişkilendirme' },
        { label: 'Checkout CR', value: fmtPct(r.conversions.checkoutConversionPct), sub: `${c.checkoutComplete} / ${c.checkoutStart}` },
        { label: 'Checkout terk', value: sig.checkoutAbandon, sub: 'kurtarma akışı kayıtlı' },
        { label: 'Ödeme başarısız olayları', value: sig.failedPaymentEvents, sub: 'failed_payment_recovery' }
      ],
      escapeHtml
    )}

    <div class="ib-dash-section">
      <h3>Lead pipeline (monetizasyon)</h3>
      ${renderStatGrid(
        [
          { label: 'Tahmini pipeline', value: `${r.pipeline.estimatedTry.toLocaleString('tr-TR')} ₺` },
          { label: 'Gerçekleşen pipeline', value: `${r.pipeline.actualTry.toLocaleString('tr-TR')} ₺` },
          { label: 'Kazanma oranı', value: fmtPct(r.pipeline.winRatePct) }
        ],
        escapeHtml
      )}
    </div>

    <div class="ib-dash-links">
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="investor-metrics">Yatırımcı KPI</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="ops-command-center">Operasyon Komuta Merkezi</button>
    </div>
  `;
}

function renderPartnerOpsDashboard(ctx, escapeHtml) {
  const p = ctx.partnerOps;
  const ex = ctx.executive.partnerLeadQuality;

  return `
    <p class="ib-dash-muted">Partner teslimat ops · 24s teslimat sağlığı · <code>npm run partner:ops:run</code></p>

    <div class="ib-dash-health ${healthClass(p.overallHealth)}">
      <p class="ib-dash-kicker">Partner ops sağlığı</p>
      <strong>${escapeHtml(formatInternalHealthLabel(p.overallHealth))}</strong>
      · SLA p95 ${Math.round((p.sla?.actualP95Ms ?? 0) / 1000)}s
      ${p.sla?.breached ? ' <span class="badge badge-yellow">SLA ihlali</span>' : ''}
    </div>

    ${renderStatGrid(
      [
        { label: 'Teslimat başarısı (24s)', value: `${p.dispatchMonitoring?.successRatePct24h ?? '—'}%`, sub: `${p.dispatchMonitoring?.attempts24h ?? 0} deneme` },
        { label: 'Şimdi yeniden denenecekler', value: p.retryAutomation?.retryDueNow ?? 0, sub: `başarısız ${p.retryAutomation?.dispatch_failed ?? 0}` },
        { label: 'Sağlıksız uç noktalar', value: p.webhookHealth?.unhealthyCount ?? 0, sub: `devre ${p.webhookHealth?.circuitOpenCount ?? 0}` },
        { label: 'Pasif partnerler', value: p.webhookHealth?.inactiveEndpointCount ?? 0, sub: '7g başarı yok' },
        { label: 'CRM teslimat oranı', value: fmtPct(ex.dispatchRatePct), sub: `${ex.totalLeads} lead` },
        { label: 'Partner kazanma oranı', value: fmtPct(ex.partnerWinRatePct), sub: `ort. skor ${ex.avgLeadScore ?? '—'}` }
      ],
      escapeHtml
    )}

    ${
      p.alerts?.triggered?.length
        ? `<div class="ib-dash-section"><h3>Partner uyarıları</h3><ul class="ib-dash-alert-list">${p.alerts.triggered
            .map((a) => `<li>${escapeHtml(formatInternalAlertMessage(a.message))}</li>`)
            .join('')}</ul></div>`
        : ''
    }

    <div class="ib-dash-links">
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="partner-dispatch-logs">Teslimat logları</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="partner-endpoints">Partner kanalları</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="auto-leads">Auto leadler</button>
    </div>
  `;
}

function renderSupportDashboard(ctx, escapeHtml) {
  const s = ctx.support;

  const flowRows = (s.flows || [])
    .map(
      (f) => `
      <tr>
        <td>${escapeHtml(f.id)}</td>
        <td>${escapeHtml(f.name || f.id)}</td>
        <td>${escapeHtml((f.lifecycleFlow || f.handler || '—').toString().slice(0, 40))}</td>
      </tr>`
    )
    .join('');

  return `
    <p class="ib-dash-muted">Müşteri &amp; destek ops · P11 iş akışları · lifecycle + FAQ deflection</p>

    ${renderStatGrid(
      [
        { label: 'SSS makaleleri (CMS)', value: s.faqCount ?? '—', sub: 'admin SSS + faq-knowledge' },
        { label: 'Lifecycle kayıt (7g)', value: s.enrollments7d, sub: `${s.activeEnrollments} aktif` },
        { label: 'Başarısız mesajlar', value: s.failedMessages, sub: 'lifecycle-cron doğrula' },
        { label: 'Destek sinyalleri', value: s.supportEvents, sub: 'help_widget, escalation' },
        { label: 'Geri kazanım oranı', value: fmtPct(ctx.growth.retention.recoveryRatePct), sub: 'elde tutma vekili' },
        { label: 'Lifecycle kayıtları (30g)', value: ctx.executive.retention.lifecycleEnrolls, sub: 'tüm akışlar' }
      ],
      escapeHtml
    )}

    <div class="ib-dash-section">
      <h3>Destek iş akışları (manifest)</h3>
      <div class="ib-dash-table-wrap">
        <table class="table">
          <thead><tr><th>Kimlik</th><th>Ad</th><th>İşleyici / akış</th></tr></thead>
          <tbody>${flowRows || '<tr><td colspan="3" class="empty">Destek iş akışları yüklenemedi</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div class="ib-dash-links">
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="faqs">SSS yönetimi</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="auto-leads">Auto leadler</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="ops-command-center">Operasyon Komuta Merkezi</button>
    </div>
  `;
}
