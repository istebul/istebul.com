import { formatTry } from './finance-calculator.js';

function buildFallback(payload) {
  const vade = `${payload.termMonths || 36} ay`;
  const tone = payload.risk?.score > 60 ? 'daha temkinli' : 'dengeli';
  return `Tahmini analiz sonucuna gore ${vade} vade secenegi odeme konforu ile toplam maliyet arasinda ${tone} bir denge sunuyor. Aylik taksit ${formatTry(payload.monthlyPayment)} seviyesinde ve borc/gelir orani %${Math.round(payload.dti)} olarak hesaplandi. Nakit akisinda guvenli esik ${formatTry(payload.safeInstallment)} civarinda gorunuyor. Daha kisa vade toplam faizi azaltabilir, daha uzun vade aylik yuku hafifletebilir. Bu karar simulasyonu gercek basvuru oncesi on degerlendirme amaclidir.`;
}

export async function buildFinanceAiCommentary(payload) {
  const fallback = buildFallback(payload);
  const prompt = [
    'Finans karar asistani icin tek paragraf Turkce yorum yaz.',
    'Kesin finansal tavsiye vermeden sadece tahmini analiz dili kullan.',
    `Finansman amaci: ${payload.financePurpose}`,
    `Aylik taksit: ${formatTry(payload.monthlyPayment)}`,
    `Toplam geri odeme: ${formatTry(payload.totalRepayment)}`,
    `Borc gelir orani: %${Math.round(payload.dti)}`,
    `Risk seviyesi: ${payload.risk?.label || 'Orta'}`,
    `Oncelikler: ${(payload.priorities || []).join(', ')}`,
    'Maksimum 110 kelime.'
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context: { category: 'finance-decision-simulation' } }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) return { text: fallback, source: 'fallback' };
    const data = await response.json().catch(() => ({}));
    const text = String(data?.text || data?.output || '').trim();
    if (!text) return { text: fallback, source: 'fallback' };
    return { text, source: 'ai' };
  } catch {
    clearTimeout(timeout);
    return { text: fallback, source: 'fallback' };
  }
}
