import { vehicles } from './auto-data.js';
import { estimateAnnualCost } from './auto-cost-engine.js';

function buildReason(vehicle, form, budget) {
  const reasons = [];

  if (vehicle.price <= budget) reasons.push('bütçenize uygun');

  if (form.body === vehicle.body) {
    reasons.push(`${vehicle.body} tercihinize uygun`);
  }

  if (form.usage === 'family' && vehicle.family >= 7) {
    reasons.push('aile kullanımı için uygun');
  }

  if (form.usage === 'city' && (vehicle.fuel === 'hybrid' || vehicle.fuel === 'electric')) {
    reasons.push('şehir içi ekonomik kullanım');
  }

  if (vehicle.resale >= 8) {
    reasons.push('güçlü ikinci el değeri');
  }

  return reasons.slice(0, 3);
}

function buildRisks(vehicle, form, budget) {
  const risks = [];

  if (vehicle.price > budget) risks.push('bütçeyi aşıyor');
  if (form.loan === 'yes' && vehicle.price > budget * 0.75) risks.push('yüksek kredi yükü');
  if (vehicle.resale <= 6) risks.push('ikinci el likiditesi zayıf');

  return risks.length ? risks : ['düşük risk profili'];
}

function confidence(score) {
  return Math.min(96, Math.max(68, score));
}

export function recommendVehicles(form) {
  const budget = Number(form.budget || 0);

  return vehicles
    .map(vehicle => {
      let score = 40;

      if (vehicle.price <= budget) score += 25;
      else score -= 30;

      if (form.body === vehicle.body) score += 30;

      if (form.fuel === 'any' || form.fuel === vehicle.fuel) score += 15;

      if (form.usage === 'family') score += vehicle.family * 2;
      if (form.usage === 'city') score += vehicle.city * 2;
      if (form.usage === 'long') score += vehicle.long * 2;

      score += vehicle.resale * 2;

      if (form.loan === 'yes' && vehicle.price > budget * 0.8) {
        score -= 15;
      }

      const costs = estimateAnnualCost(vehicle, form);

      score = Math.max(35, Math.min(96, score));

      return {
        ...vehicle,
        score,
        confidence: confidence(score),
        reasons: buildReason(vehicle, form, budget),
        risks: buildRisks(vehicle, form, budget),
        costs
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
