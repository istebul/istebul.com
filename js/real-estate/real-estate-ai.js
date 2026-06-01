import { formatTry } from './real-estate-calculator.js';

function formatLocation(city, district) {
  const il = String(city || '').trim();
  const ilce = String(district || '').trim();
  if (il && ilce) return `${il} / ${ilce}`;
  return il || 'seçilen bölge';
}

function fallbackCommentary(payload) {
  const location = formatLocation(payload.city, payload.district);
  const score = Number(payload.score) || 0;
  const monthly = payload.ownership?.monthlyPayment || 0;
  const purpose = payload.purchasePurpose || 'konut kararı';

  if (score >= 85) {
    return `Bu konut profili bütçe ve lokasyon açısından güçlü görünüyor (${location}). Tahmini aylık ödeme yükü ${formatTry(monthly)} bandında; ${purpose} hedefinizle uyumlu bir denge öne çıkıyor. Karar öncesinde tapu, ekspertiz, bina yaşı ve deprem/yapı güvenliği kontrollerini tamamlamanız önerilir. En mantıklı sonraki adım, aynı il içinde benzer bütçeli 2–3 alternatifi karşılaştırmaktır.`;
  }
  if (score >= 70) {
    return `Bu konut profili bütçe ve lokasyon açısından dengeli görünüyor (${location}). Ancak karar öncesinde toplam aylık ödeme, aidat, bina yaşı, deprem/yapı güvenliği ve tapu/ekspertiz kontrolleri ayrıca doğrulanmalıdır. Mevcut verilere göre en mantıklı sonraki adım, seçilen il/ilçe içinde benzer bütçeli alternatifleri karşılaştırmak ve kredi yükünü gelir oranına göre yeniden test etmektir.`;
  }
  if (score >= 55) {
    return `${location} için oluşturulan profil dikkatli ilerlemeyi işaret ediyor. Aylık ödeme baskısı veya risk göstergeleri sınırda olabilir; peşinat, vade ve konut tipi senaryolarını yeniden dengelemeniz faydalıdır. Bu çıktı bilgilendirme amaçlıdır; bağlayıcı finansal veya hukuki danışmanlık değildir.`;
  }
  return `Mevcut girdiler yüksek riskli bir konut karar profiline işaret edebilir (${location}). Önce aylık ödeme kapasitesi, kredi yükü ve toplam maliyet senaryolarını gözden geçirmeniz; ardından ekspertiz ve tapu kontrolleriyle ilerlemeniz önerilir. Bu metin tahmini analizdir, kesin teklif veya taahhüt içermez.`;
}

export async function buildHousingAiCommentary(payload) {
  const safeFallback = fallbackCommentary(payload);
  const location = formatLocation(payload.city, payload.district);
  const prompt = [
    'Konut karar asistanı için tek paragraf kurumsal Türkçe yorum üret.',
    'Kesin finansal, hukuki veya tapu danışmanlığı iddiası verme; "tahmini analiz" dili kullan.',
    `Skor: ${payload.score}/100 (${payload.scoreBand?.label || ''})`,
    `Amaç: ${payload.purchasePurpose || '—'}`,
    `Risk: ${payload.risk?.label || '—'}`,
    `Lokasyon: ${location}`,
    `Aylık taksit tahmini: ${formatTry(payload.ownership?.monthlyPayment)}`,
    `Toplam maliyet tahmini: ${formatTry(payload.ownership?.realTotal)}`,
    `Öncelikler: ${(payload.priorities || []).join(', ') || 'genel denge'}`,
    'Maksimum 100 kelime, net ve güven veren ton.'
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

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
    const text = String(json?.result ?? json?.text ?? json?.output ?? json?.message ?? '').trim();
    if (!text) return { text: safeFallback, source: 'fallback' };
    return { text, source: 'ai' };
  } catch {
    clearTimeout(timeout);
    return { text: safeFallback, source: 'fallback' };
  }
}
