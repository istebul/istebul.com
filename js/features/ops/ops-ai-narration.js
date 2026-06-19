/**
 * P15 — Bounded LLM narration for ops decision brief (admin only).
 */
import { postAiProxy } from '../../core/ai-proxy-client.js';
import { buildSanitizedOpsBriefForAi } from './ops-decision-assistant.js';

const OPS_AI_BUDGET_KEY = 'istebul_ops_ai_narration_budget';

/**
 * Separate budget from consumer Auto narration.
 */
export function canCallOpsAiNarration(maxPerHour = 8) {
  if (typeof sessionStorage === 'undefined') return true;
  const hourMs = 60 * 60 * 1000;
  const now = Date.now();
  try {
    const raw = sessionStorage.getItem(OPS_AI_BUDGET_KEY);
    let budget = raw ? JSON.parse(raw) : { count: 0, windowStart: now };
    if (now - budget.windowStart > hourMs) {
      budget = { count: 0, windowStart: now };
    }
    if (budget.count >= maxPerHour) return false;
    budget.count += 1;
    sessionStorage.setItem(OPS_AI_BUDGET_KEY, JSON.stringify(budget));
    return true;
  } catch {
    return true;
  }
}

/**
 * @param {ReturnType<import('./ops-decision-assistant.js').buildOpsDecisionBrief>} brief
 * @param {object} [opts]
 */
export async function requestOpsAiNarration(brief, opts = {}) {
  if (!canCallOpsAiNarration(opts.maxPerHour ?? 8)) {
    return { ok: false, error: 'rate_limited', message: 'Saatlik AI özet limitine ulaşıldı.' };
  }

  const payload = buildSanitizedOpsBriefForAi(brief);
  if (payload.length > 2800) {
    return { ok: false, error: 'brief_too_large', message: 'Metrik özeti çok büyük — yalnızca deterministik öneriler gösteriliyor.' };
  }

  const prompt = `Sen isteBul şirket operasyonları danışmanısın. Aşağıdaki JSON yalnızca ölçülmüş metrikler ve deterministik uyarılardır.
KURALLAR:
- Yeni rakam UYDURMA; yalnızca JSON'daki sayıları kullan.
- Türkçe, CEO/COO için 6 madde: growth, funnel, churn, partner, pricing, conversion.
- Her madde: durum (1 cümle) + önerilen aksiyon (1 cümle).
- Toplam en fazla 220 kelime.

JSON:
${payload}`;

  try {
    const proxy = await postAiProxy({ prompt });

    if (!proxy.ok) {
      if (proxy.status === 0) {
        return {
          ok: false,
          error: 'network',
          message: proxy.error || 'Bağlantı hatası'
        };
      }
      return {
        ok: false,
        error: proxy.data?.error || proxy.error || `http_${proxy.status}`,
        message: 'AI özeti alınamadı — deterministik öneriler geçerli.'
      };
    }

    const data = proxy.data;
    const text = String(data.result || data.text || data.content || data.message || '').trim();
    if (!text) {
      return { ok: false, error: 'empty_response', message: 'Boş AI yanıtı.' };
    }
    return { ok: true, text };
  } catch (err) {
    return {
      ok: false,
      error: 'network',
      message: err instanceof Error ? err.message : 'Bağlantı hatası'
    };
  }
}
