import { vehicles as localVehicles } from './auto-data.js';

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
    costProfile: Array.isArray(row.vehicle_cost_profiles)
      ? row.vehicle_cost_profiles[0]
      : null,
    image_url: row.image_url || null,
    source: 'supabase'
  };
}

export async function getVehicleCatalog() {
  const url = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return localVehicles;
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/vehicle_catalog?select=*&is_active=eq.true&limit=500&_ts=${Date.now()}`,
      {
        cache: 'no-store',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      }
    );

    if (!res.ok) {
      return localVehicles;
    }

    const rows = await res.json();

    if (!Array.isArray(rows) || !rows.length) {
      return localVehicles;
    }

    return rows.map(mapVehicle);
  } catch {
    return localVehicles;
  }
}
