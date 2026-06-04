'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

const POST_SELECT =
  'id,title,slug,content,excerpt,category,content_type,cover_image_url,is_featured,source_label,source_url,created_at';

function loadSeedPosts() {
  const seed = JSON.parse(
    fs.readFileSync(path.join(root, 'data/content/auto-guide-seed-headlines.json'), 'utf8')
  );
  return (seed.headlines || []).slice(0, 12).map((item, index) => ({
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt || '',
    body: item.excerpt || '',
    category: 'auto',
    content_type: 'blog',
    cover_image_url: item.cover_image_url || '',
    is_featured: Boolean(item.is_featured),
    source_label: item.source_label || 'isteBul',
    source_url: '',
    created_at: new Date(Date.now() - index * 86400000).toISOString()
  }));
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
  if (remote.length) return remote;
  return loadSeedPosts();
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
  loadSeedPosts
};
