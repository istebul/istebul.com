import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const sb = createClient(url, serviceKey);

function estimate(row) {
  const price = Number(row.price_reference || 0);
  const fuel = row.fuel;

  let fuelCity = 8.0;
  let fuelHighway = 6.2;
  let charging = 0;

  if (fuel === 'hybrid') {
    fuelCity = 4.8;
    fuelHighway = 4.4;
  }

  if (fuel === 'diesel') {
    fuelCity = 6.3;
    fuelHighway = 5.1;
  }

  if (fuel === 'electric') {
    fuelCity = 0;
    fuelHighway = 0;
    charging = Math.round(price * 0.012);
  }

  const annualMaintenance =
    row.maintenance_score <= 5 ? 48000 :
    row.maintenance_score <= 7 ? 32000 :
    22000;

  const annualInsurance =
    price < 1200000 ? 14000 :
    price < 2200000 ? 22000 :
    36000;

  const annualKasko =
    price < 1200000 ? 28000 :
    price < 2200000 ? 52000 :
    90000;

  const annualTax =
    fuel === 'electric' ? 8000 :
    price > 2500000 ? 28000 :
    15000;

  const annualTires =
    price > 2200000 ? 22000 : 14000;

  const depreciation3y =
    row.resale_score >= 8 ? 0.22 :
    row.resale_score >= 6 ? 0.30 :
    0.38;

  const depreciation5y =
    row.resale_score >= 8 ? 0.34 :
    row.resale_score >= 6 ? 0.45 :
    0.56;

  return {
    vehicle_id: row.id,
    fuel_city: fuelCity,
    fuel_highway: fuelHighway,
    annual_maintenance: annualMaintenance,
    annual_insurance: annualInsurance,
    annual_kasko: annualKasko,
    annual_tax: annualTax,
    annual_tires: annualTires,
    annual_ev_charging: charging,
    depreciation_3y: depreciation3y,
    depreciation_5y: depreciation5y,
    source: 'seed',
    confidence: 72
  };
}

const { data: vehicles, error } = await sb
  .from('vehicle_catalog')
  .select('*');

if (error) {
  console.error(error);
  process.exit(1);
}

const rows = vehicles.map(estimate);

const { error: upsertError } = await sb
  .from('vehicle_cost_profiles')
  .upsert(rows, {
    onConflict: 'vehicle_id'
  });

if (upsertError) {
  console.error(upsertError);
  process.exit(1);
}

console.log(`Seeded ${rows.length} vehicle cost profiles`);
