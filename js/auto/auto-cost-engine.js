export function estimateAnnualCost(vehicle, form) {
  const km = Number(form.km || 10000);
  const fuelFactor = { electric: 1.2, hybrid: 2.2, diesel: 3.1, gasoline: 3.8 }[vehicle.fuel] || 3.5;
  const fuel = Math.round(km * fuelFactor);
  const insurance = Math.round(vehicle.price * 0.028);
  const maintenance = Math.round(vehicle.price * (vehicle.maintenance >= 8 ? 0.018 : 0.026));
  const tax = vehicle.price > 1500000 ? 18000 : 12000;
  const total = fuel + insurance + maintenance + tax;
  return { fuel, insurance, maintenance, tax, total };
}
