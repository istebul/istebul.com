/**
 * Decision Results V2 — premium sonuç paneli UI ve yazdırma.
 */
import { escapeHtml, resolveExecutiveSummary, trackDecisionV2Event } from '../core/decision-results-v2.js';

const MOUNT_CLASS = 'dr2-root';

function riskBadgeClass(level) {
  const label = String(level || 'Orta');
  if (label.includes('Yüksek')) return 'dr2-risk--high';
  if (label.includes('Düşük')) return 'dr2-risk--low';
  return 'dr2-risk--mid';
}

function scoreBarWidth(value, max = 100) {
  const pct = Math.min(100, Math.max(0, (Number(value) / max) * 100));
  return `${Math.round(pct)}%`;
}

/**
 * @param {import('../core/decision-results-v2.js').DecisionResultV2} data
 */
export function renderDecisionResultsV2Html(data) {
  const esc = escapeHtml;
  const subScores = (data.subScores || []).filter((s) => s?.label);
  const alternatives = (data.alternatives || []).filter((a) => a?.title);
  const notices = (data.notices || []).filter(Boolean);
  const nextSteps = (data.nextSteps || []).filter(Boolean);
  const strengths = (data.strengths || []).filter(Boolean);
  const weaknesses = (data.weaknesses || []).filter(Boolean);

  const subScoreHtml = subScores.length
    ? `<div class="dr2-subscores" role="list">
        ${subScores
          .map((item) => {
            const max = item.max === null ? null : item.max ?? 100;
            const display =
              max == null
                ? esc(String(item.value))
                : `${esc(String(item.value))}${max ? `<small>/${max}</small>` : ''}`;
            const bar =
              max == null
                ? ''
                : `<div class="dr2-bar" aria-hidden="true"><span style="width:${scoreBarWidth(item.value, max)}"></span></div>`;
            return `<article class="dr2-subscore" role="listitem">
              <div class="dr2-subscore-head"><span>${esc(item.label)}</span><strong>${display}</strong></div>
              ${bar}
            </article>`;
          })
          .join('')}
      </div>`
    : '';

  return `
    <section class="dr2-panel" data-dr2-category="${esc(data.category)}" aria-label="AI karar raporu V2">
      <header class="dr2-hero">
        <p class="dr2-kicker">isteBul · ${esc(data.categoryLabel)} · Premium karar raporu</p>
        <h2 class="dr2-title">Karar analizi özeti</h2>
      </header>

      <div class="dr2-kpi-grid">
        <article class="dr2-kpi dr2-kpi--decision">
          <span>Karar Skoru</span>
          <strong>${esc(String(data.decisionScore ?? '—'))}<small>/100</small></strong>
          <div class="dr2-bar dr2-bar--accent" aria-hidden="true"><span style="width:${scoreBarWidth(data.decisionScore)}"></span></div>
        </article>
        <article class="dr2-kpi dr2-kpi--confidence">
          <span>Güven Skoru</span>
          <strong>${esc(String(data.confidenceScore ?? '—'))}<small>/100</small></strong>
          <div class="dr2-bar" aria-hidden="true"><span style="width:${scoreBarWidth(data.confidenceScore)}"></span></div>
        </article>
        <article class="dr2-kpi dr2-kpi--risk">
          <span>Risk Seviyesi</span>
          <strong><span class="dr2-risk ${riskBadgeClass(data.riskLevel)}">${esc(data.riskLevel || 'Orta')}</span></strong>
        </article>
        <article class="dr2-kpi dr2-kpi--cost">
          <span>${esc(data.totalCost?.label || 'Toplam Maliyet')}</span>
          <strong>${esc(data.totalCost?.value || '—')}</strong>
          ${data.totalCost?.hint ? `<small>${esc(data.totalCost.hint)}</small>` : ''}
        </article>
      </div>

      ${notices.length ? `<div class="dr2-notices">${notices.map((n) => `<p>${esc(n)}</p>`).join('')}</div>` : ''}

      ${subScoreHtml}

      <div class="dr2-columns">
        <article class="dr2-block dr2-block--pros">
          <h3>Güçlü yönler</h3>
          <ul>${strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </article>
        <article class="dr2-block dr2-block--cons">
          <h3>Zayıf yönler / Dikkat edilecekler</h3>
          <ul>${weaknesses.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
        </article>
      </div>

      ${
        alternatives.length
          ? `<section class="dr2-alternatives" aria-label="Alternatif öneriler">
          <h3>Alternatif öneriler</h3>
          <div class="dr2-alt-grid">
            ${alternatives
              .map(
                (alt) => `
              <article class="dr2-alt-card">
                <h4>${esc(alt.title)}</h4>
                ${alt.description ? `<p>${esc(alt.description)}</p>` : ''}
                ${alt.meta ? `<span class="dr2-alt-meta">${esc(alt.meta)}</span>` : ''}
              </article>`
              )
              .join('')}
          </div>
        </section>`
          : ''
      }

      <article class="dr2-block dr2-block--executive">
        <h3>AI Executive Summary</h3>
        <p class="dr2-executive" data-dr2-executive>${esc(data.executiveSummary || 'Özet hazırlanıyor…')}</p>
        ${data.summarySource ? `<p class="dr2-source-hint">Kaynak: ${esc(data.summarySource === 'ai' ? 'AI destekli' : 'Kural tabanlı danışman')}</p>` : ''}
      </article>

      <article class="dr2-block dr2-block--steps">
        <h3>Sonraki adımlar</h3>
        <ol>${nextSteps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>
      </article>

      <div class="dr2-actions">
        <button type="button" class="dr2-btn dr2-btn--primary" data-dr2-print>
          Karar Raporunu İndir / Yazdır
        </button>
      </div>
    </section>`;
}

function buildPrintDocument(data) {
  const esc = escapeHtml;
  const strengths = (data.strengths || []).map((s) => `<li>${esc(s)}</li>`).join('');
  const weaknesses = (data.weaknesses || []).map((w) => `<li>${esc(w)}</li>`).join('');
  const steps = (data.nextSteps || []).map((s) => `<li>${esc(s)}</li>`).join('');

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>isteBul Karar Raporu — ${esc(data.categoryLabel)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #0f172a; line-height: 1.5; }
    h1 { font-size: 1.35rem; margin: 0 0 8px; }
    .meta { color: #475569; font-size: 0.9rem; margin-bottom: 20px; }
    .kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 16px 0; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .kpi span { display: block; font-size: 0.75rem; color: #64748b; }
    .kpi strong { font-size: 1.1rem; }
    h2 { font-size: 1rem; margin: 20px 0 8px; }
    ul, ol { margin: 0; padding-left: 1.2rem; }
    .executive { background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 14px; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>isteBul — ${esc(data.categoryLabel)} Karar Raporu</h1>
  <p class="meta">Kategori: ${esc(data.categoryLabel)} · ${esc(new Date().toLocaleString('tr-TR'))}</p>
  <div class="kpis">
    <div class="kpi"><span>Karar Skoru</span><strong>${esc(String(data.decisionScore))}/100</strong></div>
    <div class="kpi"><span>Güven Skoru</span><strong>${esc(String(data.confidenceScore))}/100</strong></div>
    <div class="kpi"><span>Risk</span><strong>${esc(data.riskLevel)}</strong></div>
    <div class="kpi"><span>${esc(data.totalCost?.label || 'Toplam maliyet')}</span><strong>${esc(data.totalCost?.value || '—')}</strong></div>
  </div>
  <h2>Güçlü yönler</h2>
  <ul>${strengths}</ul>
  <h2>Dikkat edilecekler</h2>
  <ul>${weaknesses}</ul>
  <h2>AI Executive Summary</h2>
  <p class="executive">${esc(data.executiveSummary || '')}</p>
  <h2>Sonraki adımlar</h2>
  <ol>${steps}</ol>
  <p class="meta">Bilgilendirme amaçlıdır; bağlayıcı teklif değildir.</p>
</body>
</html>`;
}

export function printDecisionReport(data) {
  const html = buildPrintDocument(data);
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'Karar raporu yazdırma');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    window.print();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  frame.contentWindow?.focus();
  setTimeout(() => {
    try {
      frame.contentWindow?.print();
    } finally {
      setTimeout(() => frame.remove(), 800);
    }
  }, 250);
}

/**
 * @param {HTMLElement} container
 * @param {object} rawData — adapter çıktısı (_summaryCtx ile)
 * @param {object} [options]
 */
export async function mountDecisionResultsV2(container, rawData, options = {}) {
  if (!container || !rawData) return null;

  const { insert = 'prepend', trackFn, partnerSelector, skipSummary = false } = options;
  const existing = container.querySelector(`.${MOUNT_CLASS}`);
  if (existing) existing.remove();

  const wrapper = document.createElement('div');
  wrapper.className = MOUNT_CLASS;
  wrapper.innerHTML = renderDecisionResultsV2Html(rawData);

  if (insert === 'prepend') container.prepend(wrapper);
  else if (insert === 'afterbegin' && container.firstChild) container.insertBefore(wrapper, container.firstChild);
  else container.appendChild(wrapper);

  const panel = wrapper.querySelector('.dr2-panel');
  const data = { ...rawData };

  if (!skipSummary && !String(data.executiveSummary || '').trim()) {
    const summary = await resolveExecutiveSummary(
      data.category,
      rawData._summaryCtx || {
        decisionScore: data.decisionScore,
        riskLevel: data.riskLevel,
        totalCostValue: data.totalCost?.value,
        strengths: data.strengths,
        weaknesses: data.weaknesses
      },
      data.executiveSummary
    );
    data.executiveSummary = summary.text;
    data.summarySource = summary.source;
    const execEl = wrapper.querySelector('[data-dr2-executive]');
    if (execEl) execEl.textContent = summary.text;
    const hint = wrapper.querySelector('.dr2-source-hint');
    if (!hint && panel) {
      const p = document.createElement('p');
      p.className = 'dr2-source-hint';
      p.textContent = `Kaynak: ${summary.source === 'ai' ? 'AI destekli' : 'Kural tabanlı danışman'}`;
      wrapper.querySelector('.dr2-block--executive')?.appendChild(p);
    }
  } else if (data.executiveSummary) {
    data.summarySource = data.summarySource || 'rules';
  }

  wrapper.querySelector('[data-dr2-print]')?.addEventListener('click', () => {
    trackDecisionV2Event('decision_report_print_click', {
      category: data.category,
      metadata: { score: data.decisionScore },
      trackFn
    });
    printDecisionReport(data);
  });

  if (partnerSelector) {
    const partnerEl = document.querySelector(partnerSelector);
    if (partnerEl && !partnerEl.dataset.dr2PartnerBound) {
      partnerEl.dataset.dr2PartnerBound = '1';
      partnerEl.addEventListener('click', () => {
        trackDecisionV2Event('decision_partner_cta_click', {
          category: data.category,
          trackFn
        });
      });
    }
  }

  trackDecisionV2Event('decision_result_v2_view', {
    category: data.category,
    metadata: { score: data.decisionScore, risk: data.riskLevel },
    trackFn
  });

  return { panel, data };
}
