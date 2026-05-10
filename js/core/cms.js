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

    const s = {};
    (settingsRes || []).forEach(r => s[r.key] = r.value);

    const set = (key, fn) => { if (s[key]) document.querySelectorAll('[data-cms="' + key + '"]').forEach(fn); };

    set('site-name', el => el.textContent = s['site-name']);
    set('site-subtitle', el => el.textContent = s['site-subtitle']);
    set('hero-eyebrow', el => el.textContent = s['hero-eyebrow']);
    set('hero-title', el => el.textContent = s['hero-title']);
    set('hero-desc', el => el.textContent = s['hero-desc']);
    set('phone', el => { el.textContent = s.phone; if (el.tagName === 'A') el.href = 'tel:' + s.phone.replace(/\s/g, ''); });
    set('email', el => { el.textContent = s.email; if (el.tagName === 'A') el.href = 'mailto:' + s.email; });
    set('address', el => el.textContent = s.address);

    if (s.title) document.title = s.title;

    if (annRes?.length > 0) {
      const text = annRes[0].content || annRes[0].title;
      document.querySelectorAll('[data-cms="announcement"]').forEach(el => el.innerHTML = '<strong>Duyuru:</strong> ' + text);
    }

    if (s.maintenance === 'true') {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center"><div><h1>🔧 Bakım modu</h1><p>Sitemiz kısa süreliğine bakımda.</p></div></div>';
    }

  } catch (err) {
    console.warn('CMS yüklenemedi:', err);
  }
}
