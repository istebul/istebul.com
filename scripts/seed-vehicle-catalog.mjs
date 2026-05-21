import { createClient } from '@supabase/supabase-js';
import { vehicles } from '../js/auto/auto-data.js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const sb = createClient(url, serviceKey);

function insuranceBand(price) {
  if (price < 1200000) return 'low';
  if (price < 2200000) return 'medium';
  return 'high';
}

function kaskoBand(price) {
  if (price < 1200000) return 'low';
  if (price < 2200000) return 'medium';
  return 'high';
}

function taxBand(fuel, price) {
  if (fuel === 'electric') return 'low';
  if (price > 2500000) return 'high';
  return 'medium';
}

function depreciationScore(resale) {
  return Math.max(1, Math.min(10, resale));
}

function reliabilityScore(maintenance) {
  return Math.max(1, Math.min(10, maintenance + 1));
}

function parseVehicle(v) {
  const parts = v.name.split(' ');
  const year = Number(parts[0]);
  const brand = parts[1];
  const model = parts.slice(2).join(' ');

  return {
    brand,
    model,
    trim: null,
    model_year: year,
    body: v.body,
    fuel: v.fuel,
    transmission: 'automatic',
    price_reference: v.price,

    city_consumption: null,
    highway_consumption: null,

    family_score: v.family,
    city_score: v.city,
    long_score: v.long,
    resale_score: v.resale,
    maintenance_score: v.maintenance,
    reliability_score: reliabilityScore(v.maintenance),
    depreciation_score: depreciationScore(v.resale),

    insurance_band: insuranceBand(v.price),
    kasko_band: kaskoBand(v.price),
    tax_band: taxBand(v.fuel, v.price),

    source: 'seed',
    is_active: true
  };
}

const rows = vehicles.map(parseVehicle);

const { data, error } = await sb
  .from('vehicle_catalog')
  .upsert(rows, {
    onConflict: 'brand,model,trim,model_year,fuel,body'
  })
  .select('id,brand,model');

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Seeded ${data.length} vehicles`);
