export function estimateAnnualCost(vehicle, form) {
  const km = Number(form.km || 10000);
  const profile = vehicle.costProfile || null;

  if (profile) {
    const fuelCity = Number(profile.fuel_city || 0);
    const fuelHighway = Number(profile.fuel_highway || 0);
    const annualEvCharging = Number(profile.annual_ev_charging || 0);

    const fuelUnitCost = {
      electric: 1,
      hybrid: 45,
      diesel: 45,
      gasoline: 46
    }[vehicle.fuel] || 45;

    const averageConsumption = vehicle.fuel === 'electric'
      ? 0
      : ((fuelCity || 0) * 0.65) + ((fuelHighway || fuelCity || 0) * 0.35);

    const fuel = vehicle.fuel === 'electric'
      ? annualEvCharging
      : Math.round((km / 100) * averageConsumption * fuelUnitCost);

    const maintenance = Number(profile.annual_maintenance || 0);
    const insurance = Number(profile.annual_insurance || 0);
    const kasko = Number(profile.annual_kasko || 0);
    const tax = Number(profile.annual_tax || 0);
    const tires = Number(profile.annual_tires || 0);
    const depreciation3y = Number(profile.depreciation_3y || 0);
    const depreciationAnnual = Math.round((Number(vehicle.price || 0) * depreciation3y) / 3);

    const total = fuel + maintenance + insurance + kasko + tax + tires + depreciationAnnual;

    return {
      fuel,
      insurance,
      kasko,
      maintenance,
      tax,
      tires,
      depreciation: depreciationAnnual,
      total,
      source: 'truth'
    };
  }

  const fuelFactor = { electric: 1.2, hybrid: 2.2, diesel: 3.1, gasoline: 3.8 }[vehicle.fuel] || 3.5;
  const fuel = Math.round(km * fuelFactor);
  const insurance = Math.round(vehicle.price * 0.028);
  const maintenance = Math.round(vehicle.price * (vehicle.maintenance >= 8 ? 0.018 : 0.026));
  const tax = vehicle.price > 1500000 ? 18000 : 12000;
  const total = fuel + insurance + maintenance + tax;

  return { fuel, insurance, maintenance, tax, total, source: 'estimate' };
}
