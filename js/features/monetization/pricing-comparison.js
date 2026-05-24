/** Feature matrix for pricing conversion (transparent, no checkmark dark patterns). */

export const PRICING_FEATURE_ROWS = Object.freeze([
  {
    label: 'Auto TCO maliyet analizi',
    hint: '5 adımlı rehberli özet',
    free: true,
    pro: true,
    enterprise: true
  },
  {
    label: 'Araç karşılaştırma',
    free: '2 model',
    pro: 'Sınırsız',
    enterprise: 'Sınırsız + API'
  },
  {
    label: 'Premium karar raporu',
    free: false,
    pro: true,
    enterprise: true
  },
  {
    label: 'Şeffaf AI gerekçe özeti',
    free: false,
    pro: true,
    enterprise: true
  },
  {
    label: 'Öncelikli partner yönlendirme',
    free: false,
    pro: true,
    enterprise: 'SLA ile'
  },
  {
    label: 'Karar geçmişi & export',
    free: false,
    pro: true,
    enterprise: true
  },
  {
    label: 'Kurumsal SLA & çoklu kullanıcı',
    free: false,
    pro: false,
    enterprise: true
  }
]);

function renderCell(value) {
  if (value === true) {
    return '<span class="revenue-compare-yes" aria-label="Dahil">✓</span>';
  }
  if (value === false) {
    return '<span class="revenue-compare-no" aria-label="Dahil değil">—</span>';
  }
  return `<span class="revenue-compare-partial">${value}</span>`;
}

export function renderFeatureComparisonTable() {
  const head = `
    <thead>
      <tr>
        <th scope="col">Özellik</th>
        <th scope="col">Başlangıç</th>
        <th scope="col"><span class="revenue-compare-popular-col">Pro <em>En popüler</em></span></th>
        <th scope="col">Enterprise</th>
      </tr>
    </thead>`;

  const body = PRICING_FEATURE_ROWS.map((row) => `
      <tr>
        <th scope="row">
          ${row.label}
          ${row.hint ? `<small>${row.hint}</small>` : ''}
        </th>
        <td>${renderCell(row.free)}</td>
        <td>${renderCell(row.pro)}</td>
        <td>${renderCell(row.enterprise)}</td>
      </tr>`).join('');

  return `
    <div class="revenue-feature-compare" data-pricing-feature-compare>
      <h3 class="revenue-feature-compare-title">Plan karşılaştırması</h3>
      <p class="revenue-feature-compare-lead">Önce ücretsiz TCO görünürlüğü; Pro ile karşılaştırma ve rapor derinliği.</p>
      <div class="revenue-feature-compare-scroll">
        <table class="revenue-feature-compare-table">
          ${head}
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
}
