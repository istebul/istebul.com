/**
 * Admin lead intelligence — deterministic AI summary for CRM drawer.
 */
import { computePartnerMatchScores, formatPartnerMatchScoresHtml } from '../partner/partner-match-engine.js';

function riskFromLead(lead) {
  const score = Number(lead.lead_score);
  const urgency = String(lead.urgency || '').toLowerCase();
  if (urgency === 'high' || score >= 80) return 'Orta-yüksek';
  if (score >= 55) return 'Orta';
  return 'Düşük-orta';
}

function userTypeFromLead(lead) {
  const usage = String(lead.usage || '').toLowerCase();
  const loan = String(lead.loan || lead.financing_intent || '').toLowerCase();
  if (loan === 'yes' || loan === 'evet') return 'Finansman odaklı alıcı';
  if (usage === 'family') return 'Aile kullanım profili';
  if (usage === 'city') return 'Şehir içi kullanım profili';
  if (usage === 'long') return 'Uzun yol / yoğun km profili';
  return 'Genel araç alıcı profili';
}

function potentialValueFromLead(lead) {
  const budget = Number(lead.budget);
  const score = Number(lead.lead_score);
  if (budget >= 2_000_000 || score >= 85) return 'Yüksek';
  if (budget >= 1_000_000 || score >= 65) return 'Orta-yüksek';
  if (budget >= 500_000 || score >= 45) return 'Orta';
  return 'İzleme';
}

function purchaseProximityFromLead(lead) {
  const timeline = String(lead.purchase_timeline || '');
  const urgency = String(lead.urgency || '').toLowerCase();
  if (timeline === '0-30' || urgency === 'high') return 'Yakın vade (0–30 gün)';
  if (timeline === '1-3') return 'Orta vade (1–3 ay)';
  if (timeline === '3-6') return 'Planlı (3–6 ay)';
  return 'Erken araştırma';
}

function conversionLikelihood(lead) {
  const score = Number(lead.lead_score) || 0;
  const timeline = String(lead.purchase_timeline || '');
  if (score >= 75 && (timeline === '0-30' || timeline === '1-3')) return 'yüksek';
  if (score >= 55) return 'orta';
  return 'düşük';
}

function partnerRecommendation(lead, matches) {
  const top = matches[0];
  const loan = String(lead.loan || lead.financing_intent || '').toLowerCase();
  if (loan === 'yes' || loan === 'evet') {
    const fin = matches.find((m) => m.route === 'finance_partner') || top;
    return `${fin.name} — ${fin.category} (${fin.score}/100 · ${fin.reason})`;
  }
  return top ?
      `${top.name} — ${top.category} (${top.score}/100 · ${top.reason})`
    : 'Partner havuzu değerlendirilmeli';
}

function buildNarrative(lead, summary) {
  const parts = [];
  if (summary.userType.includes('Finansman')) {
    parts.push('Finansman ihtiyacı yüksek');
  } else {
    parts.push(`${summary.userType.toLowerCase()} tespit edildi`);
  }
  parts.push(`ödeme kapasitesi ${summary.potentialValue === 'Yüksek' ? 'güçlü' : 'dengeli'}`);
  parts.push(
    summary.conversionLikelihood === 'yüksek'
      ? 'yakın vadede dönüşüm olasılığı yüksek'
      : 'takip ve teklif netliği gerekli'
  );
  return `${parts.join(', ')}.`;
}

/**
 * @param {Record<string, unknown>} lead
 * @param {Array<object>} [partners]
 */
export function buildLeadAiSummary(lead = {}, partners) {
  const matches = computePartnerMatchScores(lead, partners);
  const conversionLikelihoodValue = conversionLikelihood(lead);

  const summary = {
    userType: userTypeFromLead(lead),
    riskLevel: riskFromLead(lead),
    potentialValue: potentialValueFromLead(lead),
    purchaseProximity: purchaseProximityFromLead(lead),
    conversionLikelihood: conversionLikelihoodValue,
    partnerRecommendation: partnerRecommendation(lead, matches),
    narrative: ''
  };

  summary.narrative = buildNarrative(lead, summary);
  return summary;
}

/**
 * @param {Record<string, unknown>} lead
 * @param {(value: unknown) => string} esc
 * @param {{ partners?: Array<object>, source?: 'live'|'static' }} [options]
 */
export function renderLeadAiSummaryHtml(lead, esc, options = {}) {
  const e = typeof esc === 'function' ? esc : (s) => String(s ?? '');
  const partners = options.partners;
  const summary = buildLeadAiSummary(lead, partners);
  const matches = computePartnerMatchScores(lead, partners);

  return `
    <section class="lead-drawer-section lead-ai-intelligence">
      <h4>AI Lead Özeti</h4>
      <p class="lead-ai-narrative">${e(summary.narrative)}</p>
      <dl class="lead-ai-grid">
        <div><dt>Kullanıcı tipi</dt><dd>${e(summary.userType)}</dd></div>
        <div><dt>Risk seviyesi</dt><dd>${e(summary.riskLevel)}</dd></div>
        <div><dt>Potansiyel değer</dt><dd>${e(summary.potentialValue)}</dd></div>
        <div><dt>Satın alma yakınlığı</dt><dd>${e(summary.purchaseProximity)}</dd></div>
        <div><dt>Dönüşüm olasılığı</dt><dd>${e(summary.conversionLikelihood)}</dd></div>
        <div><dt>Partner yönlendirme</dt><dd>${e(summary.partnerRecommendation)}</dd></div>
      </dl>
      <h5 class="lead-ai-subtitle">Partner Uyumu</h5>
      ${formatPartnerMatchScoresHtml(matches, e, { source: options.source || 'static' })}
    </section>`;
}

export { computePartnerMatchScores, formatPartnerMatchScoresHtml };
