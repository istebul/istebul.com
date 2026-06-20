/**
 * P17 — Admin HTML for unit economics model.
 */

/**
 * @param {ReturnType<import('./unit-economics-model.js').buildUnitEconomicsModel>} model
 * @param {(s: string) => string} escapeHtml
 */
export function renderUnitEconomicsPanel(model, escapeHtml) {
  const fmt = (n) => (n == null ? '—' : typeof n === 'number' ? n.toLocaleString('tr-TR') : String(n));
  const fmtTry = (n) => (n == null ? '—' : `${fmt(n)} ₺`);
  const fmtPct = (n) => (n == null ? '—' : `${n}%`);
  const fmtMo = (n) => (n == null ? '—' : `${n} ay`);

  const healthHtml =
    model.health?.length ?
      `<ul class="ib-ue-health">${model.health.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`
      : '<p class="text-muted-sm">Tüm hedef oranlar planlama bandında.</p>';

  return `
    <section class="ib-unit-economics" aria-labelledby="unit-economics-title">
      <h3 id="unit-economics-title" style="margin:24px 0 8px">Birim ekonomisi (yatırımcı modeli)</h3>
      <p class="text-muted-sm" style="margin:0 0 16px">
        Son ${model.windowDays} gün · CAC/LTV/ARPU canlı + planlama varsayımları ·
        Export: <code>npm run metrics:unit-economics</code>
      </p>

      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">ARPU</div><div class="stat-value">${fmtTry(model.arpu.try)}</div><div class="stat-sub">${escapeHtml(model.arpu.source)}</div></div>
        <div class="stat-card"><div class="stat-label">CAC</div><div class="stat-value">${fmtTry(model.cac.try)}</div><div class="stat-sub">${model.cac.newPaidUsers} ücretli · harcama ${fmtTry(model.cac.marketingSpendTry)}</div></div>
        <div class="stat-card"><div class="stat-label">LTV</div><div class="stat-value">${fmtTry(model.ltv.try)}</div><div class="stat-sub">${fmtMo(model.ltv.lifetimeMonths)} ömür · churn ${model.ltv.monthlyChurnPct != null ? (model.ltv.monthlyChurnPct * 100).toFixed(1) : '—'}%/ay</div></div>
        <div class="stat-card"><div class="stat-label">Payback</div><div class="stat-value">${fmtMo(model.payback.months)}</div><div class="stat-sub">hedef ≤ ${model.payback.targetMonthsMax} ay</div></div>
        <div class="stat-card"><div class="stat-label">Brüt marj</div><div class="stat-value">${fmtPct(model.grossMargin.pct)}</div><div class="stat-sub">hedef ${model.grossMargin.targetPct}% · var ${fmtTry(model.grossMargin.variableCostPerUserTry)}/kullanıcı</div></div>
        <div class="stat-card"><div class="stat-label">LTV / CAC</div><div class="stat-value">${fmt(model.ratios.ltvCac)}×</div><div class="stat-sub">min hedef ${model.ratios.ltvCacTargetMin}×</div></div>
      </div>

      <div style="height:18px"></div>
      <h4 style="margin:0 0 10px">Partner &amp; maliyet katmanları</h4>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Partner marjı</div><div class="stat-value">${fmtPct(model.partnerMargin?.grossMarginPct)}</div><div class="stat-sub">gerçekleşme ${fmtPct(model.partnerMargin?.realizationPct)}</div></div>
        <div class="stat-card"><div class="stat-label">AI maliyeti / Pro kullanıcı</div><div class="stat-value">${fmtTry(model.aiCost.aiCostPerProUserTry)}</div><div class="stat-sub">${model.aiCost.aiCallsPerProUserMonth} çağrı/ay</div></div>
        <div class="stat-card"><div class="stat-label">Destek maliyeti / kullanıcı</div><div class="stat-value">${fmtTry(model.supportCost.supportCostPerUserTry)}</div><div class="stat-sub">${escapeHtml(model.supportCost.source)}</div></div>
        <div class="stat-card"><div class="stat-label">Maliyet / ücretli</div><div class="stat-value">${fmtTry(model.conversionEconomics.costPerPaidTry)}</div><div class="stat-sub">Gelir/ücretli ${fmtTry(model.conversionEconomics.revenuePerPaidTry)}</div></div>
      </div>

      <div style="height:18px"></div>
      <h4 style="margin:0 0 10px">Dönüşüm ekonomisi</h4>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">İniş → lead</div><div class="stat-value">${fmtPct(model.conversionEconomics.landingToLeadPct)}</div></div>
        <div class="stat-card"><div class="stat-label">Checkout CR</div><div class="stat-value">${fmtPct(model.conversionEconomics.checkoutConversionPct)}</div></div>
        <div class="stat-card"><div class="stat-label">Ücretli CR</div><div class="stat-value">${fmtPct(model.conversionEconomics.paidConversionPct)}</div></div>
        <div class="stat-card"><div class="stat-label">Maliyet / lead</div><div class="stat-value">${fmtTry(model.conversionEconomics.costPerLeadTry)}</div></div>
      </div>

      <div style="height:18px"></div>
      <h4 style="margin:0 0 8px">Model sağlığı</h4>
      ${healthHtml}
    </section>`;
}
