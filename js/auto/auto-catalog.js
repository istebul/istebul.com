import { vehicles as localVehicles } from './auto-data.js';

function mapVehicle(row, profilesMap = {}) {
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
    image_url: row.image_url || null,
    costProfile: profilesMap[row.id] || null,
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
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`
    };

    const [vehiclesRes, profilesRes] = await Promise.all([
      fetch(
        `${url}/rest/v1/vehicle_catalog?select=*&is_active=eq.true&limit=500&_ts=${Date.now()}`,
        { cache: 'no-store', headers }
      ),
      fetch(
        `${url}/rest/v1/vehicle_cost_profiles?select=*`,
        { cache: 'no-store', headers }
      )
    ]);

    if (!vehiclesRes.ok) {
      return localVehicles;
    }

    const vehiclesRows = await vehiclesRes.json();
    const profileRows = profilesRes.ok ? await profilesRes.json() : [];

    const profilesMap = {};

    profileRows.forEach(row => {
      profilesMap[row.vehicle_id] = row;
    });

    return vehiclesRows.map(v => mapVehicle(v, profilesMap));
  } catch {
    return localVehicles;
  }
}
