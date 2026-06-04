/**
 * Public-facing announcements, blog posts, and marketing campaigns.
 * Reads Supabase when available; falls back to curated defaults without throwing.
 */

import autoGuideSeed from '../../../data/content/auto-guide-seed-headlines.json' with { type: 'json' };
import finansGuideSeed from '../../../data/content/finans-guide-seed-headlines.json' with { type: 'json' };
import konutGuideSeed from '../../../data/content/konut-guide-seed-headlines.json' with { type: 'json' };
import sigortaGuideSeed from '../../../data/content/sigorta-guide-seed-headlines.json' with { type: 'json' };
import tatilGuideSeed from '../../../data/content/tatil-guide-seed-headlines.json' with { type: 'json' };
import { escapeHtml } from '../../core/security.js';

const GUIDE_SEED_BY_CATEGORY = Object.freeze({
  auto: autoGuideSeed,
  konut: konutGuideSeed,
  tatil: tatilGuideSeed,
  finans: finansGuideSeed,
  sigorta: sigortaGuideSeed
});

export const GUIDE_CATEGORIES = Object.freeze([
  { id: 'auto', label: 'Araba', ctaHref: '/auto/', ctaLabel: 'Ücretsiz analiz' },
  { id: 'konut', label: 'Konut', ctaHref: '/konut/', ctaLabel: 'Konut analizi' },
  { id: 'tatil', label: 'Tatil', ctaHref: '/tatil/', ctaLabel: 'Tatil planla' },
  { id: 'finans', label: 'Finansman', ctaHref: '/finansman/', ctaLabel: 'Finans karşılaştır' },
  { id: 'sigorta', label: 'Sigorta', ctaHref: '/sigorta/', ctaLabel: 'Sigorta rehberi' }
]);

const POST_SELECT =
  'id,title,slug,content,excerpt,category,content_type,cover_image_url,is_featured,source_label,source_url,created_at';

const POST_SELECT_LEGACY =
  'id,title,slug,content,excerpt,category,cover_image_url,is_featured,source_label,source_url,created_at';

export function getGuideCategory(id) {
  const key = String(id || '').trim().toLowerCase();
  return GUIDE_CATEGORIES.find((cat) => cat.id === key) || null;
}

function mapPostRow(row) {
  return {
    id: row.id,
    title: row.title || 'Yazı',
    slug: row.slug || String(row.id),
    body: row.content || '',
    excerpt: row.excerpt || '',
    category: row.category || 'auto',
    content_type: row.content_type || 'news',
    cover_image_url: row.cover_image_url || '',
    is_featured: Boolean(row.is_featured),
    source_label: row.source_label || '',
    source_url: row.source_url || '',
    created_at: row.created_at
  };
}

export function normalizeGuidePost(post) {
  return mapPostRow(post);
}

function fallbackGuidesFromSeed(category, limit = 6) {
  const seed = GUIDE_SEED_BY_CATEGORY[category];
  const headlines = Array.isArray(seed?.headlines) ? seed.headlines : [];
  return headlines.slice(0, limit).map((item, index) => ({
    id: `seed-${category}-${index}`,
    title: item.title,
    slug: item.slug,
    body:
      item.body ||
      `${item.excerpt || ''}\n\nBu rehber bilgilendirme amaçlıdır; bağlayıcı teklif veya finansal tavsiye değildir. Kişisel profilinize göre analiz için ilgili karar aracını kullanabilirsiniz.`,
    excerpt: item.excerpt || '',
    category,
    content_type: 'blog',
    cover_image_url: item.cover_image_url || '',
    is_featured: Boolean(item.is_featured),
    source_label: item.source_label || '',
    source_url: item.source_url || '',
    created_at: new Date().toISOString()
  }));
}

export function fetchAllGuideSeeds(limitPerCategory = 4) {
  return GUIDE_CATEGORIES.flatMap((cat) => fallbackGuidesFromSeed(cat.id, limitPerCategory));
}

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

async function restGet(path, { allowLegacyPosts = false } = {}) {
  const cfg = getSupabaseHeaders();
  if (!cfg) return [];
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${path}`, { headers: cfg.headers });
    if (!res.ok) {
      if (allowLegacyPosts && res.status === 400 && path.startsWith('posts?')) {
        const legacyPath = path
          .replace(POST_SELECT, POST_SELECT_LEGACY)
          .replace(/&content_type=[^&]+/g, '');
        if (legacyPath !== path) return restGet(legacyPath, { allowLegacyPosts: false });
      }
      return [];
    }
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

export async function fetchPublishedPosts(limit = 12, category = '', contentType = 'blog') {
  const catKey = getGuideCategory(category)?.id;
  const categoryFilter = catKey ? `&category=eq.${encodeURIComponent(catKey)}` : '';
  const type = String(contentType || 'blog').trim().toLowerCase();
  const typeFilter = type ? `&content_type=eq.${encodeURIComponent(type)}` : '';
  const rows = await restGet(
    `posts?select=${POST_SELECT}&is_published=eq.true${typeFilter}${categoryFilter}&order=is_featured.desc,created_at.desc&limit=${limit}`,
    { allowLegacyPosts: true }
  );
  const mapped = rows.map(mapPostRow);
  if (mapped.length) return mapped;

  const fallbackCat = catKey || String(category || '').trim().toLowerCase();
  if (fallbackCat && GUIDE_SEED_BY_CATEGORY[fallbackCat]) {
    return fallbackGuidesFromSeed(fallbackCat, limit);
  }
  if (!fallbackCat && (type === 'blog' || type === 'news')) {
    return fetchAllGuideSeeds(Math.max(3, Math.ceil(limit / GUIDE_CATEGORIES.length))).slice(0, limit);
  }
  return [];
}

export async function fetchPublishedPostsByCategory(category, limit = 6, contentType = 'news') {
  const cat = getGuideCategory(category)?.id || String(category || 'auto').trim().toLowerCase();
  const rows = await fetchPublishedPosts(limit, cat, contentType);
  if (rows.length) return rows;
  if (contentType === 'news' && GUIDE_SEED_BY_CATEGORY[cat]) return fallbackGuidesFromSeed(cat, limit);
  return [];
}

export async function fetchPostBySlug(slug) {
  const safe = encodeURIComponent(String(slug || '').trim());
  if (!safe) return null;
  const rows = await restGet(
    `posts?select=${POST_SELECT}&is_published=eq.true&slug=eq.${safe}&limit=1`
  );
  if (rows[0]) return mapPostRow(rows[0]);

  for (const category of Object.keys(GUIDE_SEED_BY_CATEGORY)) {
    const hit = fallbackGuidesFromSeed(category, 50).find((post) => post.slug === String(slug || '').trim());
    if (hit) return hit;
  }
  return null;
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
  const safe = encodeURIComponent(String(slug || '').trim());
  if (!safe) return '/blog/';
  return `/blog/${safe}/`;
}
