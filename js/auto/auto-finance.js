export async function getFinanceOffers() {
  const url = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;

  if (!url || !key) return [];

  try {
    const res = await fetch(
      `${url}/rest/v1/finance_offers?select=*&is_active=eq.true&order=monthly_rate.asc`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      }
    );

    if (!res.ok) return [];

    return await res.json();
  } catch {
    return [];
  }
}
