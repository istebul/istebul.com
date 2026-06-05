/**
 * AI İlan Analizi V1 — yönetici özeti.
 * AI yalnızca açıklama üretir; skorları değiştirmez.
 */

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(n);
}

function listingTypeLabel(type) {
  if (type === 'vehicle') return 'Araç ilanı';
  if (type === 'housing') return 'Konut ilanı';
  return 'İlan';
}

/**
 * @param {object} result — engine çıktısı
 */
export function buildListingAiSummary(result = {}) {
  const typeLabel = listingTypeLabel(result.listingType);
  const strengths = (result.strengths || []).slice(0, 3).join('; ') || '—';
  const weaknesses = (result.weaknesses || []).slice(0, 3).join('; ') || '—';
  const totalCost =
    result.listingType === 'vehicle'
      ? formatMoney(result.totalCostEstimate?.firstYearTotal)
      : formatMoney(result.totalCostEstimate?.totalAcquisitionCost);

  const sourceNote = result.source?.listingUrl
    ? `İlan bağlantısı (${result.source.label || 'Diğer'}) yalnızca kaynak olarak saklanmıştır; üçüncü taraf siteden otomatik veri çekilmemiştir. `
    : '';

  const paragraphs = [
    `${typeLabel} analizi tamamlandı. Karar skorunuz ${result.decisionScore}/100 (${result.scoreLabel || '—'}). Bu skor deterministik motor tarafından üretilmiştir; yapay zekâ skoru yeniden hesaplamaz. ${sourceNote}Analiz, kullanıcı tarafından girilen alanlara dayalı bilgi amaçlı bir tahmindir; kesin fiyat veya değerleme iddiası taşımaz.`,
    `Güven skoru ${result.confidenceScore}/100, fiyat uygunluğu ${result.priceFit}/100 ve risk seviyesi "${result.riskLevel}" olarak modellenmiştir. Güçlü yönler: ${strengths}. Dikkat alanları: ${weaknesses}.`,
    `Toplam maliyet tahmini ${totalCost}. Bu değer bilgilendirme amaçlıdır; bağlayıcı teklif, ekspertiz, tapu, hasar kaydı veya rayiç araştırması yerine geçmez. Karar öncesi ekspertiz, tapu/kadastro kontrolü, hasar kaydı ve kredi/sigorta ön onayı gibi adımları manuel doğrulamanız önerilir.`
  ];

  return {
    summary: paragraphs.join('\n\n'),
    paragraphs,
    bullets: [
      `Karar skoru: ${result.decisionScore}/100`,
      `Güven skoru: ${result.confidenceScore}/100`,
      `Fiyat uygunluğu: ${result.priceFit}/100`,
      `Risk: ${result.riskLevel}`
    ],
    source: 'deterministic',
    scoresSnapshot: {
      decisionScore: result.decisionScore,
      confidenceScore: result.confidenceScore,
      priceFit: result.priceFit,
      riskLevel: result.riskLevel
    }
  };
}

/**
 * Opsiyonel LLM açıklaması — hata durumunda deterministik metne düşer.
 * @param {object} result
 * @param {object} [options]
 */
export async function fetchListingExecutiveSummary(result = {}, options = {}) {
  const deterministic = buildListingAiSummary(result);
  const before = {
    decisionScore: result.decisionScore,
    confidenceScore: result.confidenceScore,
    priceFit: result.priceFit,
    riskLevel: result.riskLevel
  };

  if (options.skipProxy) {
    return { ...deterministic, source: 'deterministic' };
  }

  try {
    const config = window.__env || {};
    const url = String(config.SUPABASE_URL || '').replace(/\/$/, '');
    const key = config.SUPABASE_ANON_KEY || '';
    if (!url || !key) {
      return { ...deterministic, source: 'deterministic' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs || 5000);

    const response = await fetch(`${url}/functions/v1/decision-intelligence`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category: 'listing_analysis',
        vertical: result.listingType,
        decisionScore: result.decisionScore,
        confidenceScore: result.confidenceScore,
        overallRisk: result.riskLevel,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        executiveOnly: true,
        planTier: options.planTier || 'guest'
      }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!response.ok) {
      return { ...deterministic, source: 'deterministic' };
    }

    const data = await response.json().catch(() => ({}));
    const aiText = String(data?.executiveSummary || data?.summary || '').trim();
    if (!aiText) {
      return { ...deterministic, source: 'deterministic' };
    }

    return {
      summary: aiText,
      paragraphs: [aiText],
      bullets: deterministic.bullets,
      source: 'ai',
      scoresSnapshot: deterministic.scoresSnapshot
    };
  } catch {
    return { ...deterministic, source: 'deterministic' };
  } finally {
    if (
      result.decisionScore !== before.decisionScore ||
      result.confidenceScore !== before.confidenceScore ||
      result.priceFit !== before.priceFit ||
      result.riskLevel !== before.riskLevel
    ) {
      result.decisionScore = before.decisionScore;
      result.confidenceScore = before.confidenceScore;
      result.priceFit = before.priceFit;
      result.riskLevel = before.riskLevel;
    }
  }
}
