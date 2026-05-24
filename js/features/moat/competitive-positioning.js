/**
 * Competitive positioning copy — defensible differentiation (P3).
 */

export const MOAT_PILLARS = Object.freeze([
  {
    id: 'deterministic',
    title: 'Sayılar motordan, AI anlatır',
    summary:
      'Uyum skoru, TCO ve lead skoru kural tabanlıdır. LLM fiyat veya skoru değiştiremez — anti-hallucination sözleşmesi.'
  },
  {
    id: 'closed_loop',
    title: 'Kapalı döngü partner OS',
    summary:
      'Skorlu lead → imzalı webhook → retry → partner callback → outcome graph. Listeleyici formu değil, operasyonel teslimat.'
  },
  {
    id: 'data_moat',
    title: 'Anonim outcome graph',
    summary:
      'Segment bazında kapanış sinyalleri skor kalibrasyonuna girer. UI kopyalanır; biriken outcome verisi kopyalanmaz.'
  },
  {
    id: 'neutral',
    title: 'Tarafsız karar katmanı',
    summary:
      'Sahibinden envanter değil, banka ürün satışı değil — yüksek düşünme maliyetli kararlar için nötr altyapı.'
  }
]);

export const COMPETITOR_FRAMES = Object.freeze([
  { id: 'classifieds', name: 'İlan marketplaces', counter: 'Fit + TCO + finansman yükü — arama değil karar' },
  { id: 'fintech', name: 'Oran karşılaştırma', counter: 'Varlık bağlamında aylık yük — sadece faiz tablosu değil' },
  { id: 'generic_ai', name: 'Genel AI sohbet', counter: 'Şeffaf metodoloji + güven bandı — karanlık öneri değil' },
  { id: 'ota', name: 'OTA / rezervasyon', counter: 'Bütçe + finansman fit — anlık bilet değil' }
]);

export function renderMoatPillarsHtml() {
  return `
    <div class="ib-moat-pillars">
      ${MOAT_PILLARS.map(
        (p) => `
        <article class="ib-moat-pillar" id="moat-${p.id}">
          <h3>${p.title}</h3>
          <p>${p.summary}</p>
        </article>`
      ).join('')}
    </div>`;
}

export function renderCompetitorFramesHtml() {
  return `
    <ul class="ib-moat-competitor-list">
      ${COMPETITOR_FRAMES.map(
        (c) => `
        <li>
          <strong>${c.name}</strong>
          <span>${c.counter}</span>
        </li>`
      ).join('')}
    </ul>`;
}
