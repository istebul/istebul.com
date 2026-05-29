/**
 * Deterministic partner match scoring for admin ops (not shown to end users).
 */

const DEFAULT_PARTNERS = Object.freeze([
  {
    id: 'mercan-premium',
    name: 'Mercan Premium Cars',
    route: 'dealer_partner',
    specialties: ['suv', 'premium', 'hybrid', 'electric'],
    budgetMin: 1_200_000
  },
  {
    id: 'suvmarket',
    name: 'SUVMarket',
    route: 'dealer_partner',
    specialties: ['suv', 'family'],
    budgetMin: 800_000
  },
  {
    id: 'otovitrin',
    name: 'OtoVitrin',
    route: 'dealer_partner',
    specialties: ['sedan', 'hatchback', 'city'],
    budgetMin: 500_000
  },
  {
    id: 'istebul-finans',
    name: 'isteBul Finans Partner',
    route: 'finance_partner',
    specialties: ['loan', 'financing'],
    budgetMin: 0
  },
  {
    id: 'sigorta-partner',
    name: 'Sigorta Partner Ağı',
    route: 'insurance_partner',
    specialties: ['insurance'],
    budgetMin: 0
  }
]);

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

/**
 * @param {Record<string, unknown>} lead
 * @param {Array<object>} [partners]
 * @returns {Array<{ id: string, name: string, route: string, score: number }>}
 */
export function computePartnerMatchScores(lead = {}, partners = DEFAULT_PARTNERS) {
  const list = Array.isArray(partners) ? partners : DEFAULT_PARTNERS;
  const budget = lead.budget ?? lead.totalBudget ?? lead.finance_loan_amount;

  return list
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

      if (partner.route === String(lead.partner_route || '')) score += 8;

      return {
        id: partner.id,
        name: partner.name,
        route: partner.route,
        score: Math.min(100, Math.max(0, Math.round(score)))
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function formatPartnerMatchScoresHtml(scores, esc) {
  const e = typeof esc === 'function' ? esc : (s) => String(s ?? '');
  const rows = (Array.isArray(scores) ? scores : []).slice(0, 5);
  if (!rows.length) {
    return '<p class="text-muted-sm">Partner uyumu hesaplanamadı.</p>';
  }
  return `
    <ul class="partner-match-list">
      ${rows
        .map(
          (row) => `
        <li class="partner-match-item">
          <span class="partner-match-name">${e(row.name)}</span>
          <strong class="partner-match-score">${e(String(row.score))}/100</strong>
        </li>`
        )
        .join('')}
    </ul>`;
}
