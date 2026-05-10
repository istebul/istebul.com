export async function loadCMS() {
  try {
    const url = window.__env?.SUPABASE_URL;
    const key = window.__env?.SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const headers = { 'apikey': key, 'Authorization': 'Bearer ' + key };

    const [settingsRes, annRes] = await Promise.all([
      fetch(url + '/rest/v1/site_settings?select=*', { headers }).then(r => r.json()),
      fetch(url + '/rest/v1/announcements?select=*&is_active=eq.true&order=created_at.desc&limit=1', { headers }).then(r => r.json())
    ]);

    const settings = {};
    (settingsRes || []).forEach(r => settings[r.key] = r.value);

    if (settings.title) document.title = settings.title;

    if (settings.phone) document.querySelectorAll('[data-cms="phone"]').forEach(el => {
      el.textContent = settings.phone;
      if (el.tagName === 'A') el.href = 'tel:' + settings.phone.replace(/\s/g, '');
    });

    if (settings.email) document.querySelectorAll('[data-cms="email"]').forEach(el => {
      el.textContent = settings.email;
      if (el.tagName === 'A') el.href = 'mailto:' + settings.email;
    });

    if (settings.address) document.querySelectorAll('[data-cms="address"]').forEach(el => el.textContent = settings.address);

    ['instagram','twitter','facebook','linkedin'].forEach(key => {
      if (settings[key]) document.querySelectorAll('[data-cms="' + key + '"]').forEach(el => el.href = settings[key]);
    });

    if (annRes?.length > 0) {
      const text = annRes[0].content || annRes[0].title;
      document.querySelectorAll('[data-cms="announcement"]').forEach(el => el.innerHTML = '<strong>Duyuru:</strong> ' + text);
    }

    if (settings.maintenance === 'true') {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center"><div><h1>🔧 Bakım modu</h1><p>Sitemiz kısa süreliğine bakımda.</p></div></div>';
    }

  } catch (err) {
    console.warn('CMS yüklenemedi:', err);
  }
}
