import { vehicles } from './auto-data.js';
import { estimateAnnualCost } from './auto-cost-engine.js';

function buildReason(vehicle, form) {
  const reasons = [];
  if (form.usage === 'family' && vehicle.family >= 7) reasons.push('aile kullanımı için uygun iç hacim');
  if (form.usage === 'city' && (vehicle.fuel === 'hybrid' || vehicle.fuel === 'electric')) reasons.push('şehir içi düşük kullanım maliyeti');
  if (form.usage === 'long' && vehicle.long >= 7) reasons.push('uzun yol konforu');
  if (vehicle.resale >= 8) reasons.push('güçlü ikinci el değeri');
  if (vehicle.fuel === 'hybrid') reasons.push('yakıt ekonomisi');
  if (vehicle.fuel === 'electric') reasons.push('düşük enerji gideri');
  if (!reasons.length) reasons.push('bütçe ve kullanım dengesine uygun profil');
  return reasons.slice(0, 3);
}

function buildRisks(vehicle, form, budget) {
  const risks = [];
  if (vehicle.price > budget) risks.push('bütçeyi aşıyor');
  if (form.loan === 'yes' && vehicle.price > budget * 0.8) risks.push('yüksek kredi yükü oluşturabilir');
  if (vehicle.resale <= 6) risks.push('ikinci el satış riski daha yüksek');
  if (form.km === '40000' && vehicle.fuel === 'gasoline') risks.push('yüksek yakıt maliyeti');
  return risks.length ? risks : ['düşük seviyede risk'];
}

function confidence(score) {
  if (score >= 90) return 94;
  if (score >= 80) return 87;
  if (score >= 70) return 79;
  return 68;
}

export function recommendVehicles(form) {
  const budget = Number(form.budget || 0);
  const usage = form.usage;

  return vehicles
    .map(vehicle => {
      let score = 60;

      if (vehicle.price <= budget) score += 14;
      else score -= Math.min(25, Math.round((vehicle.price - budget) / 50000));

      if (form.body === vehicle.body) score += 8;
      if (form.fuel === 'any' || form.fuel === vehicle.fuel) score += 8;

      if (usage === 'family') score += vehicle.family;
      if (usage === 'city') score += vehicle.city;
      if (usage === 'long') score += vehicle.long;
      if (usage === 'business') score += Math.round((vehicle.long + vehicle.resale) / 2);

      if (form.loan === 'yes' && vehicle.price > budget * 0.85) score -= 8;

      score += vehicle.resale - 5;
      score = Math.max(35, Math.min(98, score));

      const costs = estimateAnnualCost(vehicle, form);

      return {
        ...vehicle,
        score,
        confidence: confidence(score),
        reasons: buildReason(vehicle, form),
        risks: buildRisks(vehicle, form, budget),
        costs
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
