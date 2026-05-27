/**
 * Public-facing announcements, blog posts, and marketing campaigns.
 * Reads Supabase when available; falls back to curated defaults without throwing.
 */

import { escapeHtml } from '../../core/security.js';

export const DEFAULT_CAMPAIGNS = Object.freeze([
  {
    id: 'pro-trial',
    title: 'isteBul Pro — 7 gün ücretsiz deneme',
    summary: 'Sınırsız karşılaştırma, premium karar raporu ve gelişmiş AI gerekçe katmanı.',
    cta_label: 'Planları incele',
    cta_href: '/planlar?checkout=pro',
    badge: 'Aktif kampanya',
    ends_at: null
  },
  {
    id: 'auto-free',
    title: 'Ücretsiz Auto karar analizi',
    summary: 'TCO, uyum skoru ve finansman etkisini ~2 dakikada görün — üyelik zorunlu değil.',
    cta_label: 'Analizi başlat',
    cta_href: '/auto/',
    badge: 'Her zaman açık',
    ends_at: null
  },
  {
    id: 'partner-izmir',
    title: 'İzmir partner ağı — pilot',
    summary: 'Uygun satıcı eşleşmesi ve teklif süreci için partner yönlendirmesi (bilgilendirme amaçlı).',
    cta_label: 'Partner olun',
    cta_href: '/partner-olun.html',
    badge: 'Pilot',
    ends_at: null
  }
]);

function getSupabaseHeaders() {
  const url = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

async function restGet(path) {
  const cfg = getSupabaseHeaders();
  if (!cfg) return [];
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${path}`, { headers: cfg.headers });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function parseJsonSetting(rows, key, fallback) {
  const row = (rows || []).find((r) => r.key === key);
  if (!row?.value) return fallback;
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function formatContentDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function excerptText(text, max = 160) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export async function fetchActiveAnnouncements(limit = 12) {
  const rows = await restGet(
    `announcements?select=id,title,content,created_at&is_active=eq.true&order=created_at.desc&limit=${limit}`
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title || 'Duyuru',
    body: row.content || '',
    created_at: row.created_at
  }));
}

export async function fetchPublishedPosts(limit = 12) {
  const rows = await restGet(
    `posts?select=id,title,slug,content,created_at&is_published=eq.true&order=created_at.desc&limit=${limit}`
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title || 'Yazı',
    slug: row.slug || String(row.id),
    body: row.content || '',
    created_at: row.created_at
  }));
}

export async function fetchPostBySlug(slug) {
  const safe = encodeURIComponent(String(slug || '').trim());
  if (!safe) return null;
  const rows = await restGet(
    `posts?select=id,title,slug,content,created_at&is_published=eq.true&slug=eq.${safe}&limit=1`
  );
  return rows[0]
    ? {
        id: rows[0].id,
        title: rows[0].title || 'Yazı',
        slug: rows[0].slug || slug,
        body: rows[0].content || '',
        created_at: rows[0].created_at
      }
    : null;
}

export function normalizePublicCampaign(raw, index = 0) {
  return {
    id: String(raw?.id || `campaign-${index}`).trim() || `campaign-${index}`,
    title: String(raw?.title || 'Kampanya').trim(),
    summary: String(raw?.summary || raw?.content || '').trim(),
    cta_label: String(raw?.cta_label || 'Detay').trim(),
    cta_href: String(raw?.cta_href || '/auto/').trim(),
    badge: String(raw?.badge || 'Kampanya').trim(),
    ends_at: raw?.ends_at ? String(raw.ends_at) : null,
    is_active: raw?.is_active !== false,
    sort_order: Number.isFinite(Number(raw?.sort_order)) ? Number(raw.sort_order) : index
  };
}

export async function fetchPublicCampaigns() {
  const settings = await restGet('site_settings?select=key,value');
  const hasKey = Array.isArray(settings) && settings.some((row) => row.key === 'public_campaigns');
  const fromSettings = parseJsonSetting(settings, 'public_campaigns', null);

  if (hasKey && Array.isArray(fromSettings)) {
    return fromSettings
      .map((c, i) => normalizePublicCampaign(c, i))
      .filter((c) => c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'tr'));
  }

  if (hasKey) {
    return [];
  }

  return DEFAULT_CAMPAIGNS.map((c, i) => normalizePublicCampaign(c, i));
}

export function renderContentEmpty(message) {
  return `<p class="ib-content-empty text-muted-sm">${escapeHtml(message)}</p>`;
}

export function blogPostPath(slug) {
  return `/blog/${encodeURIComponent(String(slug || '').trim())}`;
}
