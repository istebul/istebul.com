export async function getDealerOffers(vehicle, formData = {}) {
  const url = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;

  if (!url || !key || !vehicle?.id) return [];

  const params = new URLSearchParams();
  params.set('select', 'id,title,price,km,color,dealer_name,dealer_city,dealer_district,listing_url,image_url,stock_status');
  params.set('vehicle_catalog_id', `eq.${vehicle.id}`);
  params.set('stock_status', 'eq.available');
  params.set('limit', '3');

  const city = String(formData.city || '').trim();
  if (city) {
    params.set('dealer_city', `eq.${city}`);
  }

  try {
    const res = await fetch(`${url}/rest/v1/dealer_inventory?${params.toString()}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });

    if (!res.ok) return [];

    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}
