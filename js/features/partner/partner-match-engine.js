/**
 * Deterministic partner match scoring for admin ops (not shown to end users).
 */

export const DEFAULT_PARTNER_POOL = Object.freeze([
  {
    id: 'mercan-premium',
    name: 'Mercan Premium Cars',
    route: 'dealer_partner',
    specialties: ['suv', 'premium', 'hybrid', 'electric'],
    budgetMin: 1_200_000,
    source: 'static'
  },
  {
    id: 'suvmarket',
    name: 'SUVMarket',
    route: 'dealer_partner',
    specialties: ['suv', 'family'],
    budgetMin: 800_000,
    source: 'static'
  },
  {
    id: 'otovitrin',
    name: 'OtoVitrin',
    route: 'dealer_partner',
    specialties: ['sedan', 'hatchback', 'city'],
    budgetMin: 500_000,
    source: 'static'
  },
  {
    id: 'istebul-finans',
    name: 'isteBul Finans Partner',
    route: 'finance_partner',
    specialties: ['loan', 'financing'],
    budgetMin: 0,
    source: 'static'
  },
  {
    id: 'sigorta-partner',
    name: 'Sigorta Partner Ağı',
    route: 'insurance_partner',
    specialties: ['insurance'],
    budgetMin: 0,
    source: 'static'
  }
]);

/** @deprecated use DEFAULT_PARTNER_POOL */
export const DEFAULT_PARTNERS = DEFAULT_PARTNER_POOL;

const ROUTE_LABELS = Object.freeze({
  dealer_partner: 'Bayi / Galeri',
  finance_partner: 'Finansman',
  insurance_partner: 'Sigorta',
  premium_report: 'Premium Rapor',
  general_sales: 'Genel Satış'
});

const ROUTE_SPECIALTIES = Object.freeze({
  dealer_partner: ['suv', 'sedan', 'hatchback', 'premium', 'family', 'city'],
  finance_partner: ['loan', 'financing'],
  insurance_partner: ['insurance'],
  premium_report: ['premium'],
  general_sales: ['general']
});

/**
 * @param {Record<string, unknown>} row
 */
export function mapPartnerEndpointRow(row = {}) {
  const route = String(row.route_type || row.route || 'dealer_partner');
  return {
    id: String(row.id || row.name || route),
    name: String(row.name || 'Partner'),
    route,
    specialties: ROUTE_SPECIALTIES[route] || ['general'],
    budgetMin: 0,
    priorityWeight: Number(row.priority_weight) || 0,
    isActive: row.is_active !== false,
    healthStatus: String(row.health_status || 'healthy'),
    source: 'live'
  };
}

export function partnerRouteLabel(route) {
  return ROUTE_LABELS[String(route || '')] || String(route || 'Partner');
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function timelineScore(timeline) {
  const map = { '0-30': 18, '1-3': 14, '3-6': 8, '6+': 4 };
  return map[String(timeline || '').trim()] ?? 6;
}

function urgencyScore(urgency) {
  const map = { high: 12, medium: 7, low: 3 };
  return map[String(urgency || '').toLowerCase()] ?? 5;
}

function bodyScore(body, specialties) {
  const b = String(body || '').toLowerCase();
  if (!b) return 4;
  if (specialties.includes(b)) return 16;
  if (b === 'suv' && specialties.includes('family')) return 12;
  return 2;
}

function fuelScore(fuel, specialties) {
  const f = String(fuel || '').toLowerCase();
  if (f === 'electric' && specialties.includes('electric')) return 10;
  if (f === 'hybrid' && specialties.includes('hybrid')) return 8;
  return 3;
}

function financeScore(lead, partner) {
  if (partner.route !== 'finance_partner') return 0;
  const loan = String(lead.loan || lead.financing_intent || '').toLowerCase();
  if (loan === 'yes' || loan === 'evet') return 22;
  return 6;
}

function insuranceScore(lead, partner) {
  if (partner.route !== 'insurance_partner') return 0;
  return 10;
}

function budgetScore(budget, partner) {
  const b = num(budget);
  if (b == null) return 6;
  if (b >= (partner.budgetMin || 0)) return 12;
  return 4;
}

function leadScoreBoost(leadScore) {
  const s = num(leadScore);
  if (s == null) return 0;
  if (s >= 80) return 10;
  if (s >= 60) return 6;
  return 2;
}

function buildMatchReason(lead, partner, score) {
  const reasons = [];
  const loan = String(lead.loan || lead.financing_intent || '').toLowerCase();
  if (partner.route === 'finance_partner' && (loan === 'yes' || loan === 'evet')) {
    reasons.push('finansman niyeti');
  }
  if (lead.body && (partner.specialties || []).includes(String(lead.body).toLowerCase())) {
    reasons.push('kasa uyumu');
  }
  if (String(lead.purchase_timeline || '') === '0-30') reasons.push('yakın vade');
  if (Number(lead.lead_score) >= 70) reasons.push('yüksek lead skoru');
  if (partner.source === 'live' && partner.isActive !== false) reasons.push('aktif endpoint');
  if (!reasons.length) reasons.push(score >= 80 ? 'genel profil uyumu' : 'operasyonel eşleşme');
  return reasons.slice(0, 3).join(', ');
}

/**
 * @param {Record<string, unknown>} lead
 * @param {Array<object>} [partners]
 */
export function computePartnerMatchScores(lead = {}, partners = DEFAULT_PARTNER_POOL) {
  const list = Array.isArray(partners) && partners.length ? partners : DEFAULT_PARTNER_POOL;
  const budget = lead.budget ?? lead.totalBudget ?? lead.finance_loan_amount;

  return list
    .filter((partner) => partner.isActive !== false)
    .map((partner) => {
      let score = 42;
      score += bodyScore(lead.body, partner.specialties || []);
      score += fuelScore(lead.fuel, partner.specialties || []);
      score += budgetScore(budget, partner);
      score += timelineScore(lead.purchase_timeline);
      score += urgencyScore(lead.urgency);
      score += financeScore(lead, partner);
      score += insuranceScore(lead, partner);
      score += leadScoreBoost(lead.lead_score);
      score += Math.min(8, Math.round((Number(partner.priorityWeight) || 0) / 25));

      if (partner.route === String(lead.partner_route || '')) score += 8;
      if (partner.healthStatus === 'degraded') score -= 4;
      if (partner.healthStatus === 'unhealthy') score -= 10;

      const finalScore = Math.min(100, Math.max(0, Math.round(score)));

      return {
        id: partner.id,
        name: partner.name,
        route: partner.route,
        category: partnerRouteLabel(partner.route),
        score: finalScore,
        reason: buildMatchReason(lead, partner, finalScore),
        source: partner.source || 'static',
        isActive: partner.isActive !== false
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function formatPartnerMatchScoresHtml(scores, esc, options = {}) {
  const e = typeof esc === 'function' ? esc : (s) => String(s ?? '');
  const rows = (Array.isArray(scores) ? scores : []).slice(0, 5);
  const sourceNote =
    options.source === 'live'
      ? 'Kaynak: aktif partner_endpoints'
      : 'Kaynak: statik fallback havuzu';

  if (!rows.length) {
    return `<p class="text-muted-sm">Partner uyumu hesaplanamadı.</p>`;
  }

  return `
    <p class="partner-match-source text-muted-sm">${e(sourceNote)}</p>
    <ul class="partner-match-list">
      ${rows
        .map(
          (row) => `
        <li class="partner-match-item">
          <div class="partner-match-main">
            <span class="partner-match-name">${e(row.name)}</span>
            <span class="partner-match-meta">${e(row.category)} · ${e(row.isActive === false ? 'pasif' : 'aktif')}</span>
            <span class="partner-match-reason">${e(row.reason)}</span>
          </div>
          <strong class="partner-match-score">${e(String(row.score))}/100</strong>
        </li>`
        )
        .join('')}
    </ul>`;
}
