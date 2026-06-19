/**
 * P11 — FAQ automation: static knowledge + optional Supabase faqs.
 */

let cachedStatic = null;

/**
 * @param {string} query
 * @param {string} haystack
 */
function scoreText(query, haystack) {
  const q = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const h = haystack.toLowerCase();
  let score = 0;
  for (const word of q) {
    if (h.includes(word)) score += 1;
  }
  return score;
}

export async function loadStaticFaqKnowledge() {
  if (cachedStatic) return cachedStatic;
  try {
    const res = await fetch('/data/customer/faq-knowledge.json');
    if (!res.ok) return { articles: [] };
    cachedStatic = await res.json();
    return cachedStatic;
  } catch {
    return { articles: [] };
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} sb
 */
export async function loadDynamicFaqs(sb) {
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('faqs')
      .select('id, question, answer, order_num, is_active')
      .eq('is_active', true)
      .order('order_num')
      .limit(40);
    if (error) return [];
    return (data || []).map((row) => ({
      id: `db-${row.id}`,
      category: 'faq_general',
      keywords: [],
      question: row.question,
      answer: row.answer,
      source: 'database'
    }));
  } catch {
    return [];
  }
}

/**
 * @param {string} query
 * @param {Array<object>} articles
 */
export function searchFaqArticles(query, articles = []) {
  const q = String(query || '').trim();
  if (!q) return articles.slice(0, 6);

  const scored = articles
    .map((article) => {
      const keywordBlob = (article.keywords || []).join(' ');
      const score =
        scoreText(q, article.question) * 2 +
        scoreText(q, article.answer) +
        scoreText(q, keywordBlob);
      return { article, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length) return scored.map((r) => r.article).slice(0, 6);
  return articles.slice(0, 4);
}

export async function buildFaqCorpus(sb = null) {
  const staticPack = await loadStaticFaqKnowledge();
  const dynamic = await loadDynamicFaqs(sb);
  const articles = [...(staticPack.articles || []), ...dynamic];
  return { version: staticPack.version, articles };
}
