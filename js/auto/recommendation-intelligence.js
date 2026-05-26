/**
 * Deep recommendation intelligence — deterministic scores & comparison matrix.
 */
import { buildWhyNotRanked, buildTradeoffExplanations } from '../engines/decision-consultant.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreBudgetFit(vehicle, form) {
  const budget = Number(form.budget || 0);
  const price = Number(vehicle.price || 0);
  if (!budget || !price) return 55;
  const ratio = price / budget;
  if (ratio <= 0.92) return clamp(95 - ratio * 20, 70, 95);
  if (ratio <= 1.05) return 62;
  return clamp(45 - (ratio - 1) * 80, 20, 50);
}

function scoreReliability(vehicle) {
  const maint = Number(vehicle.maintenance || 6);
  return clamp(Math.round(maint * 9 + 12), 25, 95);
}

function scoreOperatingCost(vehicle, alternatives = []) {
  const tco = Number(vehicle.costs?.total || vehicle.costs?.ownership?.annual?.operatingTotal || 0);
  if (!tco) return 50;
  const peers = alternatives.map((v) => Number(v.costs?.total || 0)).filter((n) => n > 0);
  if (!peers.length) return 65;
  const min = Math.min(...peers);
  const max = Math.max(...peers);
  if (max === min) return 70;
  return clamp(Math.round(95 - ((tco - min) / (max - min)) * 45), 30, 95);
}

function scoreResale(vehicle) {
  const dep = vehicle.costs?.ownership?.depreciation;
  if (dep?.liquidityScore) return dep.liquidityScore;
  return clamp(Math.round((Number(vehicle.resale || 6) / 10) * 85 + 10), 25, 92);
}

function idealUserProfile(vehicle, form) {
  const usage = String(form.usage || '');
  const parts = [];
  if (usage === 'family') parts.push('aile ve bagaj önceliği');
  if (usage === 'city') parts.push('şehir içi ve düşük işletme maliyeti');
  if (usage === 'long') parts.push('uzun yol konforu');
  if (form.loan === 'yes') parts.push('finansman senaryosu');
  if (vehicle.score >= 85) parts.push('profil ile güçlü uyum');
  return parts.length
    ? `İdeal profil: ${parts.join(', ')}.`
    : 'Genel kullanım profili — teklif doğrulaması ile netleşir.';
}

/**
 * @param {object} vehicle
 * @param {object} form
 * @param {{ alternatives?: object[], rank?: number, leader?: object }} ctx
 */
export function buildRecommendationIntelligence(vehicle, form, ctx = {}) {
  const alternatives = ctx.alternatives || [];
  const rank = ctx.rank ?? 0;
  const leader = ctx.leader || alternatives[0];
  const whyNot = buildWhyNotRanked(vehicle, rank + 1, leader, form);
  const tradeoffs = rank === 0 ? buildTradeoffExplanations(alternatives) : [];

  return {
    whyThisVehicle: (vehicle.reasons || []).slice(0, 4).join(' ') || 'Kural tabanlı profil uyumu.',
    whyNotAlternatives: whyNot?.summary || 'Alternatifler yakın skor bandında değerlendirilebilir.',
    tradeoffs: tradeoffs.map((t) => t.summary).join(' '),
    riskFactors: (vehicle.risks || []).slice(0, 3).join(' '),
    idealUserProfile: idealUserProfile(vehicle, form),
    confidenceScore: Number(vehicle.confidenceMeta?.score || vehicle.confidence || 0),
    budgetFitScore: scoreBudgetFit(vehicle, form),
    reliabilityScore: scoreReliability(vehicle),
    operatingCostScore: scoreOperatingCost(vehicle, alternatives),
    resaleScore: scoreResale(vehicle),
    intelligenceVersion: 'auto-v2'
  };
}

/**
 * @param {object[]} results
 * @param {object} formData
 * @param {(s: string) => string} esc
 */
export function renderComparisonMatrix(results = [], formData = {}, esc = (s) => String(s ?? '')) {
  const top = (Array.isArray(results) ? results : []).slice(0, 3);
  if (top.length < 2) return '';

  const metrics = [
    { key: 'score', label: 'Uyum skoru', fmt: (v) => `${v.score}/100` },
    {
      key: 'tco12',
      label: '12 ay TCO',
      fmt: (v) => {
        const n = Number(v.costs?.ownership?.totals?.months12 || v.costs?.total * 1 || 0);
        return n ? `₺${Math.round(n).toLocaleString('tr-TR')}` : '—';
      }
    },
    {
      key: 'monthly',
      label: 'Aylık yük',
      fmt: (v) => {
        const n = Number(v.costs?.ownership?.annual?.allInTotal || v.costs?.total || 0) / 12;
        return n ? `₺${Math.round(n).toLocaleString('tr-TR')}` : '—';
      }
    },
    {
      key: 'confidence',
      label: 'Veri güveni',
      fmt: (v) => `${v.confidenceMeta?.score ?? v.confidence ?? '—'}/100`
    },
    {
      key: 'budgetFit',
      label: 'Bütçe uyumu',
      fmt: (v) => `${buildRecommendationIntelligence(v, formData, { alternatives: top }).budgetFitScore}/100`
    },
    {
      key: 'resale',
      label: 'Likidite',
      fmt: (v) => `${buildRecommendationIntelligence(v, formData, { alternatives: top }).resaleScore}/100`
    }
  ];

  return `
    <section class="ib-auto-compare-matrix" aria-label="İlk üç öneri karşılaştırması">
      <header>
        <h3>Öneri karşılaştırma matrisi</h3>
        <p class="text-muted-sm">Deterministik skorlar — canlı teklif değildir.</p>
      </header>
      <div class="ib-auto-compare-matrix-scroll">
        <table class="ib-auto-compare-table">
          <thead>
            <tr>
              <th scope="col">Metrik</th>
              ${top.map((v, i) => `<th scope="col">#${i + 1} ${esc(v.name)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${metrics
              .map(
                (m) => `
              <tr>
                <th scope="row">${esc(m.label)}</th>
                ${top.map((v) => `<td>${esc(m.fmt(v))}</td>`).join('')}
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>`;
}

/**
 * @param {object} intel
 * @param {(s: string) => string} esc
 */
export function renderRecommendationIntelligencePanel(intel = {}, esc = (s) => String(s ?? '')) {
  if (!intel?.intelligenceVersion) return '';
  const rows = [
    ['Güven', intel.confidenceScore],
    ['Bütçe uyumu', intel.budgetFitScore],
    ['Güvenilirlik', intel.reliabilityScore],
    ['İşletme maliyeti', intel.operatingCostScore],
    ['Likidite / 2. el', intel.resaleScore]
  ];

  return `
    <section class="ib-rec-intel-panel" aria-label="Karar zekası skorları">
      <h4>Karar zekası özeti</h4>
      <div class="ib-rec-intel-scores">
        ${rows.map(([label, val]) => `<span><small>${esc(label)}</small><strong>${esc(String(val))}/100</strong></span>`).join('')}
      </div>
      <p class="text-muted-sm"><strong>İdeal profil:</strong> ${esc(intel.idealUserProfile)}</p>
      <p class="text-muted-sm"><strong>Trade-off:</strong> ${esc(intel.tradeoffs || '—')}</p>
      <p class="text-muted-sm"><strong>Neden alternatif değil:</strong> ${esc(intel.whyNotAlternatives)}</p>
    </section>`;
}
