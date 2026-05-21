import { vehicles as localVehicles } from './auto-data.js';

let cachedVehicles = null;

function mapVehicle(row) {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    name: `${row.model_year || ''} ${row.brand} ${row.model}`.trim(),
    price: Number(row.price_reference || 0),
    body: row.body,
    fuel: row.fuel,
    family: Number(row.family_score || 5),
    city: Number(row.city_score || 5),
    long: Number(row.long_score || 5),
    resale: Number(row.resale_score || 5),
    maintenance: Number(row.maintenance_score || 5),
    costProfile: Array.isArray(row.vehicle_cost_profiles) ? row.vehicle_cost_profiles[0] : null,
    source: 'supabase'
  };
}

export async function getVehicleCatalog() {
  if (cachedVehicles) return cachedVehicles;

  const url = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;

  if (!url || !key) {
    cachedVehicles = localVehicles;
    return cachedVehicles;
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/vehicle_catalog?select=*,vehicle_cost_profiles(*)&is_active=eq.true&limit=500`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      }
    );

    if (!res.ok) throw new Error('catalog fetch failed');

    const rows = await res.json();

    if (!Array.isArray(rows) || !rows.length) {
      cachedVehicles = localVehicles;
      return cachedVehicles;
    }

    cachedVehicles = rows.map(mapVehicle);
    return cachedVehicles;
  } catch {
    cachedVehicles = localVehicles;
    return cachedVehicles;
  }
}
