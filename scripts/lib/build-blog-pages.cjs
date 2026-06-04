'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

const POST_SELECT =
  'id,title,slug,content,excerpt,category,content_type,cover_image_url,is_featured,source_label,source_url,created_at';

const GUIDE_SEED_FILES = Object.freeze([
  { file: 'auto-guide-seed-headlines.json', category: 'auto' },
  { file: 'konut-guide-seed-headlines.json', category: 'konut' },
  { file: 'tatil-guide-seed-headlines.json', category: 'tatil' },
  { file: 'finans-guide-seed-headlines.json', category: 'finans' },
  { file: 'sigorta-guide-seed-headlines.json', category: 'sigorta' }
]);

function mapSeedHeadline(item, category, index) {
  const excerpt = item.excerpt || '';
  return {
    slug: item.slug,
    title: item.title,
    excerpt,
    body:
      item.body ||
      `${excerpt}\n\nBu rehber bilgilendirme amaçlıdır; bağlayıcı teklif veya finansal tavsiye değildir.`,
    category,
    content_type: 'blog',
    cover_image_url: item.cover_image_url || '',
    is_featured: Boolean(item.is_featured),
    source_label: item.source_label || 'isteBul',
    source_url: item.source_url || '',
    created_at: new Date(Date.now() - index * 86400000).toISOString()
  };
}

function loadAllGuideSeedPosts() {
  const posts = [];
  let index = 0;
  for (const { file, category } of GUIDE_SEED_FILES) {
    const seedPath = path.join(root, 'data/content', file);
    if (!fs.existsSync(seedPath)) continue;
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    for (const item of seed.headlines || []) {
      if (!item?.slug) continue;
      posts.push(mapSeedHeadline(item, category, index++));
    }
  }
  return posts;
}

function loadSeedPosts() {
  return loadAllGuideSeedPosts().filter((p) => p.category === 'auto').slice(0, 12);
}

function mergePostsForBuild(remote, seeds) {
  const bySlug = new Map();
  for (const post of seeds) {
    if (post.slug) bySlug.set(post.slug, post);
  }
  for (const post of remote) {
    if (post.slug) bySlug.set(post.slug, post);
  }
  return Array.from(bySlug.values());
}

async function fetchPostsFromSupabase(env = process.env) {
  const url = (env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.SUPABASE_ANON_KEY || '';
  if (!url || !key || key.includes('placeholder')) return [];

  const query = `posts?select=${POST_SELECT}&is_published=eq.true&content_type=in.(news,blog)&order=is_featured.desc,created_at.desc&limit=48`;
  try {
    let res = await fetch(`${url}/rest/v1/${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (!res.ok && res.status === 400) {
      const legacyQuery = query.replace(/&content_type=in\.\(news,blog\)/, '');
      if (legacyQuery !== query) {
        res = await fetch(`${url}/rest/v1/${legacyQuery}`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` }
        });
      }
    }
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return [];
    return rows.map((row) => ({
      slug: row.slug || String(row.id),
      title: row.title || 'Blog yazısı',
      excerpt: row.excerpt || '',
      body: row.content || row.excerpt || '',
      category: row.category || 'auto',
      content_type: row.content_type || 'blog',
      cover_image_url: row.cover_image_url || '',
      is_featured: Boolean(row.is_featured),
      source_label: row.source_label || '',
      source_url: row.source_url || '',
      created_at: row.created_at
    }));
  } catch {
    return [];
  }
}

async function resolveBlogPostsForBuild(env = process.env) {
  const remote = await fetchPostsFromSupabase(env);
  const seeds = loadAllGuideSeedPosts();
  const merged = mergePostsForBuild(remote, seeds);
  return merged.length ? merged : loadSeedPosts();
}

function postToSeoPage(post) {
  const body = String(post.body || '').trim();
  const excerpt = String(post.excerpt || '').trim();
  const intro = excerpt || body.slice(0, 240);
  const bodyParagraph =
    body && body.length > intro.length
      ? body
      : intro ||
        'Bu yazı bilgilendirme amaçlıdır; yatırım veya kredi tavsiyesi değildir. Kişisel kararınız için /auto/ üzerinden ücretsiz analiz başlatabilirsiniz.';

  const kicker =
    post.content_type === 'news' ? 'Güncel haber · Karar rehberi' : 'Blog · Karar rehberi';

  return {
    title: `${post.title} | isteBul Blog`,
    description: (intro || bodyParagraph).slice(0, 160),
    h1: post.title,
    intro: intro || bodyParagraph.slice(0, 240),
    bullets: post.source_label ? [`Kaynak: ${post.source_label}`] : [],
    sections: [
      {
        heading: post.content_type === 'news' ? 'Haber' : 'Özet',
        body: bodyParagraph
      }
    ],
    faqs: [],
    slug: post.slug,
    cover_image_url: post.cover_image_url || '',
    kicker
  };
}

module.exports = {
  resolveBlogPostsForBuild,
  postToSeoPage,
  loadSeedPosts,
  loadAllGuideSeedPosts,
  mergePostsForBuild
};
