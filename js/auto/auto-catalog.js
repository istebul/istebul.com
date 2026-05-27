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

function buildRestHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json'
  };
}

/**
 * PostgREST rejects unknown query params (e.g. cache-bust `_ts`) with HTTP 400.
 */
export function buildVehicleCatalogUrl(baseUrl) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  return `${root}/rest/v1/vehicle_catalog?select=*&is_active=eq.true&limit=500`;
}

export function buildVehicleCostProfilesUrl(baseUrl) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  return `${root}/rest/v1/vehicle_cost_profiles?select=*`;
}

export async function getVehicleCatalog() {
  const url = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return localVehicles;
  }

  try {
    const headers = buildRestHeaders(key);

    const [vehiclesRes, profilesRes] = await Promise.all([
      fetch(buildVehicleCatalogUrl(url), { cache: 'no-store', headers }),
      fetch(buildVehicleCostProfilesUrl(url), { cache: 'no-store', headers })
    ]);

    if (!vehiclesRes.ok) {
      console.warn(
        '[auto-catalog] vehicle_catalog request failed',
        vehiclesRes.status,
        await vehiclesRes.text().catch(() => '')
      );
      return localVehicles;
    }

    const vehiclesRows = await vehiclesRes.json();
    const profileRows = profilesRes.ok ? await profilesRes.json() : [];

    const profilesMap = {};

    profileRows.forEach((row) => {
      profilesMap[row.vehicle_id] = row;
    });

    return vehiclesRows.map((v) => mapVehicle(v, profilesMap));
  } catch (err) {
    console.warn('[auto-catalog] vehicle_catalog fetch error', err);
    return localVehicles;
  }
}
