// CMS: Admin panelinden Supabase'e kaydedilen verileri yükler
import { supabase } from './supabase.js';

export async function loadCMS() {
  try {
    const [settingsRes, announcementsRes] = await Promise.all([
      supabase.from('site_settings').select('*'),
      supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false })
    ]);

    const settings = {};
    (settingsRes.data || []).forEach(row => settings[row.key] = row.value);

    // Site başlığı
    if (settings.title) document.title = settings.title;

    // Footer iletişim
    if (settings.phone) {
      document.querySelectorAll('[data-cms="phone"]').forEach(el => el.textContent = settings.phone);
    }
    if (settings.email) {
      document.querySelectorAll('[data-cms="email"]').forEach(el => {
        el.textContent = settings.email;
        if (el.tagName === 'A') el.href = 'mailto:' + settings.email;
      });
    }
    if (settings.address) {
      document.querySelectorAll('[data-cms="address"]').forEach(el => el.textContent = settings.address);
    }

    // Sosyal medya
    ['instagram','twitter','facebook','linkedin'].forEach(key => {
      if (settings[key]) {
        document.querySelectorAll(`[data-cms="${key}"]`).forEach(el => {
          el.href = settings[key];
          el.style.display = '';
        });
      }
    });

    // Duyuru banner
    const announcements = announcementsRes.data || [];
    if (announcements.length > 0) {
      const banner = document.querySelector('[data-cms="announcement"]');
      if (banner) {
        banner.textContent = announcements[0].content || announcements[0].title;
        banner.style.display = '';
      }
    }

    // Bakım modu
    if (settings.maintenance === 'true') {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center"><h1>🔧 Bakım modu</h1><p>Sitemiz kısa süreliğine bakımda. Lütfen daha sonra tekrar deneyin.</p></div></div>';
    }

  } catch (err) {
    console.warn('CMS yüklenemedi:', err);
  }
}
