/**
 * P3.1 — Category ownership: isteBul = decision infrastructure
 * Aggressive but professional; no direct competitor bashing.
 */

export const CATEGORY_DEFINITION = Object.freeze({
  label: 'Karar altyapısı',
  english: 'decision infrastructure',
  oneLiner:
    'isteBul bir ilan sitesi, sohbet botu veya yalnızca oran karşılaştırma aracı değildir — toplam sahip olma maliyetine göre karar veren altyapıdır.'
});

export const CATEGORY_TAGLINES = Object.freeze({
  hero: 'İlan bulmak başka, doğru karar vermek başka.',
  subhero:
    'Toplam sahip olma maliyetine göre karar verin. Skor ve TCO kural tabanlıdır; yapay zeka yalnızca gerekçeyi anlatır.',
  aiContrast: 'Generic AI fikir verir. isteBul karar altyapısı sunar.',
  tco: 'Toplam sahip olma maliyetine göre karar verin.',
  partner:
    'Klasik lead formu değil — skorlu talep, imzalı teslimat ve outcome geri beslemeli partner operasyonu.'
});

export const CATEGORY_NOT = Object.freeze([
  { id: 'not_listings', label: 'İlan sitesi değil', detail: 'Envanter aramak yerine fit, TCO ve finansman yükü' },
  { id: 'not_chatbot', label: 'Sohbet botu değil', detail: 'Skor ve güven bandı deterministik; AI anlatım katmanı' },
  { id: 'not_comparison_only', label: 'Sadece karşılaştırma değil', detail: 'Oran tablosu değil — varlık bağlamında karar modeli' }
]);

export const COMPETITOR_ALTERNATIVES = Object.freeze([
  {
    id: 'classifieds',
    category: 'İlan siteleri',
    examples: 'Sahibinden, Arabam ve benzeri',
    focus: 'Envanter derinliği ve arama',
    istebul: 'Toplam maliyet, uyum skoru ve finansman yükü — karar çıktısı'
  },
  {
    id: 'generic_ai',
    category: 'Generic AI sohbet',
    examples: 'Genel amaçlı asistanlar',
    focus: 'Serbest metin fikir ve özet',
    istebul: 'Sayıları motor verir; şeffaf metodoloji ve güven bandı'
  },
  {
    id: 'fintech_compare',
    category: 'Kredi karşılaştırma',
    examples: 'Oran ve ürün tabloları',
    focus: 'En düşük faiz veya ürün listesi',
    istebul: 'Bu araç + bu peşinat için aylık yük ve TCO'
  },
  {
    id: 'lead_gen',
    category: 'Klasik lead generation',
    examples: 'Form ve çağrı merkezi odaklı',
    focus: 'Hacim ve iletişim bilgisi',
    istebul: 'Skorlu lead, webhook dispatch, outcome graph'
  }
]);

export const WIZARD_ONBOARDING = Object.freeze({
  kicker: 'Karar altyapısı · Auto',
  title: 'Toplam maliyete göre karar verin',
  lead:
    'İlan listesine takılmadan bütçe, kullanım ve finansmanı tek modelde birleştiriyoruz. ~2 dakikada özet — bağlayıcı teklif değil.',
  footnote: CATEGORY_TAGLINES.aiContrast
});

export function renderCategoryNotStripHtml() {
  return `
    <ul class="ib-category-not" aria-label="isteBul kategorisi">
      ${CATEGORY_NOT.map(
        (item) => `
        <li>
          <strong>${item.label}</strong>
          <span>${item.detail}</span>
        </li>`
      ).join('')}
    </ul>`;
}

export function renderCompetitorAlternativesHtml() {
  return `
    <div class="ib-category-alternatives">
      ${COMPETITOR_ALTERNATIVES.map(
        (row) => `
        <article class="ib-category-alt-card">
          <p class="ib-category-alt-kicker">${row.category}</p>
          <p class="text-muted-sm">${row.examples}</p>
          <div class="ib-category-alt-grid">
            <div>
              <span class="ib-category-alt-label">Tipik odak</span>
              <p>${row.focus}</p>
            </div>
            <div>
              <span class="ib-category-alt-label">isteBul</span>
              <p><strong>${row.istebul}</strong></p>
            </div>
          </div>
        </article>`
      ).join('')}
    </div>`;
}

export function renderCategoryOwnershipSectionHtml(options = {}) {
  const showTaglines = options.showTaglines !== false;
  return `
    <section class="ib-category-ownership" aria-labelledby="category-ownership-heading">
      <span class="section-kicker">Kategori</span>
      <h2 id="category-ownership-heading">${CATEGORY_DEFINITION.label} — ${CATEGORY_TAGLINES.hero}</h2>
      <p class="lead">${CATEGORY_DEFINITION.oneLiner}</p>
      ${showTaglines ? `<p class="ib-category-quote">“${CATEGORY_TAGLINES.aiContrast}”</p>` : ''}
      ${renderCategoryNotStripHtml()}
      ${renderCompetitorAlternativesHtml()}
    </section>`;
}
