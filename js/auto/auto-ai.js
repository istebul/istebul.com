import { vehicles } from './auto-data.js';
import { estimateAnnualCost } from './auto-cost-engine.js';

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

      score += vehicle.resale - 5;

      const costs = estimateAnnualCost(vehicle, form);
      return { ...vehicle, score: Math.max(35, Math.min(98, score)), costs };
    })
    .sort((a,b) => b.score - a.score)
    .slice(0,3);
}
