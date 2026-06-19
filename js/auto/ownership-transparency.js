/**
 * Enterprise trust & ownership transparency UI for /auto results.
 */
import { formatMoney } from '../core/format.js';

function esc(s, escapeHtml) {
  return (escapeHtml || ((x) => String(x ?? '')))(s);
}

export function buildResultsMetadata(results = [], formData = {}) {
  const leader = results[0];
  const generatedAt = new Date().toISOString();
  const costSource = leader?.costs?.source || 'estimate';
  const confidence = leader?.confidenceMeta?.score ?? leader?.confidence ?? null;

  return {
    generatedAt,
    methodologySummary:
      'Uyum skoru ve TCO kural motorundan gelir; yapay zeka yalnızca yorum katmanıdır — skoru değiştirmez.',
    dataConfidenceScore: confidence,
    costDataLayer: costSource === 'truth' ? 'Katalog maliyet profili' : 'Tahmini maliyet bandı',
    assumptionSummary: leader?.costs?.ownership?.assumptions || {
      km: formData.km,
      ownershipMonths: formData.ownership_months || 36
    },
    disclaimer:
      'Tüm rakamlar bilgilendirme amaçlıdır; finansal tavsiye, bağlayıcı teklif veya getiri taahhüdü değildir.'
  };
}

export function renderResultsMetadataPanel(results, formData, escapeHtml) {
  const meta = buildResultsMetadata(results, formData);
  const timeLabel = new Date(meta.generatedAt).toLocaleString('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return `
    <section class="ib-auto-results-meta" aria-label="Analiz meta verisi">
      <ul class="ib-auto-results-meta-grid">
        <li><i data-lucide="clock" aria-hidden="true"></i><span><strong>Oluşturulma</strong>${esc(timeLabel, escapeHtml)}</span></li>
        <li><i data-lucide="microscope" aria-hidden="true"></i><span><strong>Metodoloji</strong>${esc(meta.methodologySummary, escapeHtml)}</span></li>
        <li><i data-lucide="gauge" aria-hidden="true"></i><span><strong>Veri güveni</strong>${meta.dataConfidenceScore != null ? esc(`${meta.dataConfidenceScore}/100`, escapeHtml) : '—'}</span></li>
        <li><i data-lucide="database" aria-hidden="true"></i><span><strong>Maliyet katmanı</strong>${esc(meta.costDataLayer, escapeHtml)}</span></li>
      </ul>
      <p class="ib-auto-results-meta-disclaimer text-muted-sm">${esc(meta.disclaimer, escapeHtml)}</p>
    </section>`;
}

export function renderOwnershipBreakdown(vehicle, formData = {}, escapeHtml) {
  const o = vehicle?.costs?.ownership;
  if (!o) return '';

  const fin = o.financing || {};
  const a = o.annual || {};
  const d = o.depreciation || {};

  const rows = [
    ['Satın alma (referans)', formatMoney(o.purchaseCost)],
    ['Finansman (yıllık sim.)', fin.annual ? formatMoney(fin.annual) : '—'],
    ['Yakıt / enerji', formatMoney(a.fuel)],
    ['Bakım', formatMoney(a.maintenance)],
    ['Sigorta (trafik)', formatMoney(a.insurance)],
    ['Kasko', formatMoney(a.kasko)],
    ['MTV', formatMoney(a.mtv)],
    ['Muayene', formatMoney(a.inspection)],
    ['Tescil / noter / işlem', formatMoney(o.oneTime?.registrationFees)],
    ['12 ay toplam (işletme+finansman)', formatMoney(o.totals?.months12)],
    ['36 ay toplam (horizon)', formatMoney(o.totals?.months36)],
    ['12 ay tahmini değer', formatMoney(d.value12)],
    ['24 ay tahmini değer', formatMoney(d.value24)],
    ['12 ay değer kaybı', formatMoney(d.depreciationLoss12)],
    ['Likidite skoru', `${d.liquidityScore}/100`],
    ['İkinci el risk skoru', `${d.resaleRiskScore}/100`]
  ];

  return `
    <details class="ib-ownership-breakdown" data-ownership-breakdown>
      <summary><i data-lucide="pie-chart" aria-hidden="true"></i> Toplam sahip olma maliyeti — detaylı kırılım</summary>
      <dl class="ib-ownership-breakdown-grid">
        ${rows.map(([k, v]) => `<div><dt>${esc(k, escapeHtml)}</dt><dd>${esc(v, escapeHtml)}</dd></div>`).join('')}
      </dl>
      <p class="text-muted-sm">${esc(d.heuristicDisclaimer || '', escapeHtml)}</p>
    </details>`;
}

export function renderHowCalculatedPanel(vehicle, escapeHtml) {
  const o = vehicle?.costs?.ownership;
  const a = o?.assumptions || {};
  const fin = o?.financing || {};

  const items = [
    { title: 'Finansman', body: fin.note || 'Peşin senaryo' },
    { title: 'Yakıt', body: a.fuel || 'Km ve şehir/otoyol payına göre' },
    { title: 'Sigorta & kasko', body: a.insurance || 'Katalog veya fiyat bandı tahmini' },
    { title: 'Bakım', body: a.maintenance || 'Segment bakım skoru' },
    { title: 'Değer kaybı', body: a.depreciation || 'Sezgisel amortisman modeli' }
  ];

  return `
    <details class="ib-how-calculated" data-how-calculated>
      <summary><i data-lucide="help-circle" aria-hidden="true"></i> Nasıl hesaplandı?</summary>
      <div class="ib-how-calculated-grid">
        ${items
          .map(
            (item) => `
          <article>
            <h4>${esc(item.title, escapeHtml)}</h4>
            <p>${esc(item.body, escapeHtml)}</p>
          </article>`
          )
          .join('')}
      </div>
      <p class="ib-how-calculated-legend text-muted-sm">
        <strong>Gerçek:</strong> katalogdan gelen sabit girdiler ·
        <strong>Tahmin:</strong> sezgisel model ·
        <strong>AI yorum:</strong> skoru değiştirmez
      </p>
    </details>`;
}
