import { formatTry } from './real-estate-calculator.js';

function fallbackCommentary(payload) {
  const {
    score,
    ownership,
    risk,
    priorities = [],
    purchasePurpose,
    homeType
  } = payload;
  const priorityText = priorities.length ? priorities.slice(0, 3).join(', ') : 'denge';
  const riskCue = risk.score > 60 ? 'orta-yuksek' : risk.score > 35 ? 'orta' : 'dusuk';
  return `Tahmini analiz sonucuna gore ${purchasePurpose || 'konut alimi'} amacli ${homeType || 'konut'} karariniz ${score}/100 uygunluk skorunda gorunuyor. Aylik odeme yukunuz ${formatTry(ownership.monthlyPayment)} seviyesinde ve toplam sahip olma maliyeti ${formatTry(ownership.realTotal)} olarak simule edildi. Kredi/gelir dengesi ve lokasyon-riski birlikte degerlendirildiginde risk profili ${riskCue} seviyesinde. Oncelikleriniz (${priorityText}) dogrultusunda daha yeni bina, dusuk aidat veya daha yuksek pesinat senaryolari ile karar dengesini guclendirebilirsiniz. Bu cikti gercek basvuru veya ekspertiz oncesi on degerlendirme amaclidir.`;
}

export async function buildHousingAiCommentary(payload) {
  const safeFallback = fallbackCommentary(payload);
  const prompt = [
    'Konut karar asistani icin tek paragraf Turkce yorum uret.',
    'Kesin finansal tavsiye verme, sadece "tahmini analiz" dili kullan.',
    `Skor: ${payload.score}/100`,
    `Risk seviyesi: ${payload.risk.label}`,
    `Aylik taksit: ${formatTry(payload.ownership.monthlyPayment)}`,
    `Toplam maliyet: ${formatTry(payload.ownership.realTotal)}`,
    `Oncelikler: ${(payload.priorities || []).join(', ')}`,
    `Lokasyon: ${payload.city || ''} ${payload.district || ''}`,
    'Maksimum 110 kelime.'
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch('/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        context: { category: 'konut-decision-simulation', mode: 'pre-assessment' }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) return { text: safeFallback, source: 'fallback' };
    const json = await response.json().catch(() => ({}));
    const text = String(json?.text || json?.output || '').trim();
    if (!text) return { text: safeFallback, source: 'fallback' };
    return { text, source: 'ai' };
  } catch {
    clearTimeout(timeout);
    return { text: safeFallback, source: 'fallback' };
  }
}
