/**
 * P14 — HTML renderers for internal company dashboards.
 */

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
      <strong>${escapeHtml(ceo.overallHealth)}</strong>
      <span class="text-muted-sm"> · ${ceo.alerts.triggeredCount} erken müdahale uyarısı</span>
      ${
        ceo.alerts.triggered.length
          ? `<ul class="ib-dash-alert-list">${ceo.alerts.triggered
              .map((a) => `<li><strong>${escapeHtml(a.severity)}</strong> — ${escapeHtml(a.message)}</li>`)
              .join('')}</ul>`
          : '<p class="text-muted-sm" style="margin:8px 0 0">Pencerede CEO eşik uyarısı yok.</p>'
      }
    </div>

    <div class="ib-dash-section">
      <h3>CEO özeti</h3>
      <ul class="ib-dash-alert-list">${ex.ceoSummary.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
    </div>

    ${renderStatGrid(
      [
        { label: 'MRR', value: `${ex.revenue.mrrTry.toLocaleString('tr-TR')} ₺`, sub: `${ex.churn.activeSubscriptions} active subs` },
        { label: 'Funnel CR', value: fmtPct(ex.conversions.funnelConversionPct), sub: `${c.leads} / ${c.landing} leads` },
        { label: 'Paid conversions', value: c.paid, sub: fmtPct(ex.conversions.paidConversionPct) },
        { label: 'Partner dispatch', value: fmtPct(ex.partnerLeadQuality.dispatchRatePct), sub: `${ex.partnerLeadQuality.totalLeads} CRM leads` },
        { label: 'Pipeline realized', value: `${ex.pipeline.actualTry.toLocaleString('tr-TR')} ₺`, sub: `est. ${ex.pipeline.estimatedTry.toLocaleString('tr-TR')} ₺` },
        { label: 'Recovery rate', value: fmtPct(ex.retention.recoveryRatePct), sub: `${ex.retention.lifecycleEnrolls} lifecycle enrolls` }
      ],
      escapeHtml
    )}

    <div class="ib-dash-links">
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="investor-metrics">Yatırımcı KPI</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="ops-command-center">Operasyon Komuta Merkezi</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="observability">Observability</button>
    </div>
  `;
}

function renderGrowthDashboard(ctx, escapeHtml) {
  const g = ctx.growth;
  const ns = g.northStar7d;

  const funnelHtml = g.funnel7d.steps
    .map(
      (s) =>
        `<span class="ib-dash-funnel-step">${escapeHtml(s.label)}: <strong>${s.count}</strong>${s.stepCrPct != null ? ` (${s.stepCrPct}%)` : ''}</span>`
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
    <p class="ib-dash-muted">Growth command center · 7g funnel + ${ctx.windowDays}g channels · <code>npm run metrics:growth:command</code></p>

    ${renderStatGrid(
      [
        { label: 'Qualified leads (7d)', value: ns.qualifiedLeads, sub: `landing→lead ${ns.landingToLeadPct ?? '—'}%` },
        { label: 'Paid (7d)', value: ns.paidConversions, sub: `checkout CR ${ns.checkoutCrPct ?? '—'}%` },
        { label: 'Experiment exposures', value: g.experiments.exposures, sub: `${g.experiments.conversions} conversions` },
        { label: 'Paid click capture', value: g.paid.clickCapture, sub: `${g.paid.conversionSignals} signals` },
        { label: 'Return visits', value: g.retention.returnVisits, sub: `${g.retention.engagementEvents} engagement` },
        { label: 'Lifecycle enrolls', value: g.retention.lifecycleEnrolls, sub: `recovery ${g.retention.recoveryRatePct ?? '—'}%` }
      ],
      escapeHtml
    )}

    <div class="ib-dash-section">
      <h3>7-day funnel</h3>
      <div class="ib-dash-funnel">${funnelHtml}</div>
    </div>

    <div class="ib-dash-section">
      <h3>Top channels (${ctx.windowDays}d)</h3>
      <div class="ib-dash-table-wrap">
        <table class="table">
          <thead><tr><th>Channel</th><th>Events</th><th>Leads</th><th>Checkouts</th><th>Paid</th></tr></thead>
          <tbody>${channelRows || '<tr><td colspan="5" class="empty">No channel data</td></tr>'}</tbody>
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
    <p class="ib-dash-muted">Revenue &amp; billing · RevOps automations live · <code>npm run metrics:executive</code></p>

    <div class="ib-dash-health ${healthClass(sig.cancelAtPeriodEnd >= 3 ? 'warning' : 'ok')}">
      <p class="ib-dash-kicker">Churn signal</p>
      <strong>${sig.cancelAtPeriodEnd}</strong> subscriptions cancel at period end
      · Stripe webhook fails (24h): <strong>${ctx.ops.stripeWebhookFails24h}</strong>
    </div>

    ${renderStatGrid(
      [
        { label: 'MRR', value: `${r.mrrTry.toLocaleString('tr-TR')} ₺`, sub: `ARR ${r.arrTry.toLocaleString('tr-TR')} ₺` },
        { label: 'ARPU', value: `${r.arpuTry.toLocaleString('tr-TR')} ₺`, sub: `${r.churn.activeSubscriptions} billable` },
        { label: 'Attributed revenue', value: `${r.attributedRevenueTry.toLocaleString('tr-TR')} ₺`, sub: 'analytics attributed' },
        { label: 'Checkout CR', value: fmtPct(r.conversions.checkoutConversionPct), sub: `${c.checkoutComplete} / ${c.checkoutStart}` },
        { label: 'Checkout abandon', value: sig.checkoutAbandon, sub: 'recovery flow enrolled' },
        { label: 'Payment failed events', value: sig.failedPaymentEvents, sub: 'failed_payment_recovery' }
      ],
      escapeHtml
    )}

    <div class="ib-dash-section">
      <h3>Lead pipeline (monetization)</h3>
      ${renderStatGrid(
        [
          { label: 'Pipeline estimated', value: `${r.pipeline.estimatedTry.toLocaleString('tr-TR')} ₺` },
          { label: 'Pipeline realized', value: `${r.pipeline.actualTry.toLocaleString('tr-TR')} ₺` },
          { label: 'Win rate', value: fmtPct(r.pipeline.winRatePct) }
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
    <p class="ib-dash-muted">Partner delivery ops · 24h dispatch health · <code>npm run partner:ops:run</code></p>

    <div class="ib-dash-health ${healthClass(p.overallHealth)}">
      <p class="ib-dash-kicker">Partner ops health</p>
      <strong>${escapeHtml(p.overallHealth)}</strong>
      · SLA p95 ${Math.round((p.sla?.actualP95Ms ?? 0) / 1000)}s
      ${p.sla?.breached ? ' <span class="badge badge-yellow">SLA breach</span>' : ''}
    </div>

    ${renderStatGrid(
      [
        { label: 'Dispatch success (24h)', value: `${p.dispatchMonitoring?.successRatePct24h ?? '—'}%`, sub: `${p.dispatchMonitoring?.attempts24h ?? 0} attempts` },
        { label: 'Retry due now', value: p.retryAutomation?.retryDueNow ?? 0, sub: `failed ${p.retryAutomation?.dispatch_failed ?? 0}` },
        { label: 'Unhealthy endpoints', value: p.webhookHealth?.unhealthyCount ?? 0, sub: `circuit ${p.webhookHealth?.circuitOpenCount ?? 0}` },
        { label: 'Inactive partners', value: p.webhookHealth?.inactiveEndpointCount ?? 0, sub: '7d no success' },
        { label: 'CRM dispatch rate', value: fmtPct(ex.dispatchRatePct), sub: `${ex.totalLeads} leads` },
        { label: 'Partner win rate', value: fmtPct(ex.partnerWinRatePct), sub: `avg score ${ex.avgLeadScore ?? '—'}` }
      ],
      escapeHtml
    )}

    ${
      p.alerts?.triggered?.length
        ? `<div class="ib-dash-section"><h3>Partner alerts</h3><ul class="ib-dash-alert-list">${p.alerts.triggered
            .map((a) => `<li>${escapeHtml(a.message)}</li>`)
            .join('')}</ul></div>`
        : ''
    }

    <div class="ib-dash-links">
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="partner-dispatch-logs">Dispatch Logs</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="partner-endpoints">Partner Channels</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="auto-leads">Auto Leads</button>
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
    <p class="ib-dash-muted">Customer &amp; support ops · P11 workflows · lifecycle + FAQ deflection</p>

    ${renderStatGrid(
      [
        { label: 'FAQ articles (CMS)', value: s.faqCount ?? '—', sub: 'admin SSS + faq-knowledge' },
        { label: 'Lifecycle enroll (7d)', value: s.enrollments7d, sub: `${s.activeEnrollments} active` },
        { label: 'Failed messages', value: s.failedMessages, sub: 'verify lifecycle-cron' },
        { label: 'Support signals', value: s.supportEvents, sub: 'help_widget, escalation' },
        { label: 'Recovery rate', value: fmtPct(ctx.growth.retention.recoveryRatePct), sub: 'retention proxy' },
        { label: 'Lifecycle enrolls (30d)', value: ctx.executive.retention.lifecycleEnrolls, sub: 'all flows' }
      ],
      escapeHtml
    )}

    <div class="ib-dash-section">
      <h3>Support workflows (manifest)</h3>
      <div class="ib-dash-table-wrap">
        <table class="table">
          <thead><tr><th>ID</th><th>Name</th><th>Handler / flow</th></tr></thead>
          <tbody>${flowRows || '<tr><td colspan="3" class="empty">Load support-workflows.json</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div class="ib-dash-links">
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="faqs">SSS Admin</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="auto-leads">Auto Leads</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="ops-command-center">Operasyon Komuta Merkezi</button>
    </div>
  `;
}
