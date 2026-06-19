/**
 * Deterministic decision insight blocks for Auto results (AI perception without fake claims).
 */

function formatTry(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return `₺${Math.round(n).toLocaleString('tr-TR')}`;
}

function usageProfileLabel(formData = {}) {
  const usage = String(formData.usage || formData.primary_use || '').toLowerCase();
  if (usage.includes('uzun') || usage.includes('long')) return 'uzun yol';
  if (usage.includes('sehir') || usage.includes('city')) return 'şehir içi';
  if (usage.includes('aile') || usage.includes('family')) return 'aile';
  return 'karma kullanım';
}

/**
 * @param {object} vehicle
 * @param {object} formData
 * @param {{ alternatives?: object[], rank?: number }} context
 */
export function buildDecisionInsightPanels(vehicle = {}, formData = {}, context = {}) {
  const alternatives = context.alternatives || [];
  const rank = context.rank ?? 0;
  const budget = Number(formData.budget || formData.max_budget || 0);
  const monthlyTco = Math.round(Number(vehicle.costs?.total || 0) / 12);
  const budgetMonthly = budget > 0 ? Math.round(budget / 12) : null;
  const reasons = Array.isArray(vehicle.reasons) ? vehicle.reasons : [];
  const risks = Array.isArray(vehicle.risks) ? vehicle.risks : [];
  const score = Number(vehicle.score || 0);
  const confidence = vehicle.confidenceMeta || {};
  const tier = confidence.tier || (score >= 85 ? 'high' : score >= 70 ? 'medium' : 'review');

  let budgetPressure = 'Bütçe etkisi orta bantta; finansman ve sigorta teklifleriyle netleşir.';
  if (budgetMonthly && monthlyTco) {
    const ratio = monthlyTco / budgetMonthly;
    if (ratio <= 0.85) {
      budgetPressure = `Aylık TCO (${formatTry(monthlyTco)}), bütçe payınızın (~${formatTry(budgetMonthly)}/ay) altında kalıyor — operasyonel baskı düşük görünür.`;
    } else if (ratio <= 1.05) {
      budgetPressure = `Aylık TCO (${formatTry(monthlyTco)}) bütçe payınıza (~${formatTry(budgetMonthly)}/ay) yakın — marj dar; teklif doğrulaması önerilir.`;
    } else {
      budgetPressure = `Aylık TCO (${formatTry(monthlyTco)}) bütçe payınızı (~${formatTry(budgetMonthly)}/ay) aşıyor — finansman veya segment değişikliği düşünülmeli.`;
    }
  }

  const alt = alternatives.find((v) => v.name !== vehicle.name) || alternatives[rank + 1];
  let alternativeScenario = 'Alternatif senaryo için sıradaki modeli karşılaştırma merkezinde yan yana değerlendirin.';
  if (vehicle.runnerContrast?.summary) {
    alternativeScenario = vehicle.runnerContrast.summary;
  } else if (alt) {
    alternativeScenario = `${alt.name} alternatif olarak ${alt.score}/100 uyum skoru ile öne çıkıyor; TCO farkı karşılaştırma ekranında görünür.`;
  }

  const confidenceLabels = {
    high: 'Yüksek — girdi kalitesi ve maliyet verisi tutarlı',
    medium: 'Orta — teklif aşamasında doğrulama önerilir',
    review: 'Sınırlı — eksik veya tahmini girdi; sonuçları teyit edin'
  };

  const profile = usageProfileLabel(formData);
  const notSuitable = [];
  if (profile === 'uzun yol' && Number(vehicle.city || 0) < 60) {
    notSuitable.push('Yoğun uzun yol kullanımında konfor/ menzil beklentisi yüksek profiller için sınırlı kalabilir.');
  }
  if (profile === 'şehir içi' && Number(vehicle.long || 0) > 80) {
    notSuitable.push('Ağırlıklı şehir içi kullanımda büyük kasa/ SUV işletme maliyeti gereksiz yükseltebilir.');
  }
  if (budgetMonthly && monthlyTco > budgetMonthly * 1.1) {
    notSuitable.push('Mevcut bütçe payına göre operasyonel yük yüksek — daha ekonomik segment düşünülmeli.');
  }
  if (!notSuitable.length) {
    notSuitable.push(
      'Ekstrem performans, ticari filo veya çok düşük bütçe segmenti beklentisi olan profiller için uygun olmayabilir.'
    );
  }

  return {
    whyThisRecommendation:
      reasons.length > 0
        ? reasons.slice(0, 3).join(' ')
        : 'Bütçe, kullanım ve finansman girdilerinize göre kural tabanlı sıralama bu modeli öne çıkardı.',
    risks: risks.length
      ? risks.slice(0, 3).join(' ')
      : 'Belirgin risk sinyali yok; yine de canlı teklif ve sigorta primleri değişebilir.',
    alternativeScenario,
    budgetPressure,
    confidenceLevel: confidenceLabels[tier] || confidenceLabels.medium,
    notSuitableFor: notSuitable.join(' ')
  };
}

/**
 * @param {object} vehicle
 * @param {object} formData
 * @param {object} context
 * @param {(s: string) => string} escapeHtml
 */
function renderInsightCard(item, esc) {
  return `
        <article class="ib-decision-insight-card" data-insight="${item.id}">
          <header>
            <i data-lucide="${item.icon}" aria-hidden="true"></i>
            <h4>${esc(item.title)}</h4>
          </header>
          <p>${esc(item.body)}</p>
        </article>`;
}

/**
 * @param {object} vehicle
 * @param {object} formData
 * @param {object} context
 * @param {(s: string) => string} escapeHtml
 * @param {{ compact?: boolean }} [options]
 */
export function renderDecisionInsightPanels(vehicle, formData, context, escapeHtml, options = {}) {
  const esc = escapeHtml || ((s) => String(s ?? ''));
  const panels = buildDecisionInsightPanels(vehicle, formData, context);
  const compact = Boolean(options.compact ?? context?.compact);

  const items = [
    { id: 'why', title: 'Neden bu öneri?', body: panels.whyThisRecommendation, icon: 'sparkles' },
    { id: 'risks', title: 'Riskler', body: panels.risks, icon: 'alert-triangle' },
    { id: 'alt', title: 'Alternatif senaryo', body: panels.alternativeScenario, icon: 'git-compare' },
    { id: 'budget', title: 'Bütçe baskısı', body: panels.budgetPressure, icon: 'wallet' },
    { id: 'confidence', title: 'Güven seviyesi', body: panels.confidenceLevel, icon: 'shield-check' },
    { id: 'fit', title: 'Kimler için uygun değil?', body: panels.notSuitableFor, icon: 'user-x' }
  ];

  if (!compact) {
    return `
    <section class="ib-decision-insight-grid" aria-label="Karar zekası özeti">
      ${items.map((item) => renderInsightCard(item, esc)).join('')}
      <p class="ib-decision-insight-foot text-muted-sm">Kural tabanlı özet; yapay zeka sentezi skoru ve TCO değiştirmez.</p>
    </section>`;
  }

  const primary = items.filter((item) => item.id === 'why' || item.id === 'budget');
  const extra = items.filter((item) => item.id !== 'why' && item.id !== 'budget' && item.id !== 'risks');

  return `
    <section class="ib-decision-insight-grid ib-decision-insight-grid--compact" aria-label="Karar zekası özeti">
      ${primary.map((item) => renderInsightCard(item, esc)).join('')}
      <details class="ib-decision-insight-more">
        <summary>Daha fazla karar detayı (${extra.length})</summary>
        <div class="ib-decision-insight-more-grid">
          ${extra.map((item) => renderInsightCard(item, esc)).join('')}
        </div>
      </details>
      <p class="ib-decision-insight-foot text-muted-sm">Kural tabanlı özet; yapay zeka sentezi skoru ve TCO değiştirmez.</p>
    </section>`;
}

export function renderTrustLayerCompact(variant = 'home') {
  const items = [
    { icon: 'scale', text: 'Skor metodolojisi açık ve denetlenebilir' },
    { icon: 'brain', text: 'AI skoru tek başına değiştirmez' },
    { icon: 'shield', text: 'KVKK uyumlu lead toplama' },
    { icon: 'calculator', text: 'Şeffaf toplam maliyet (TCO) yaklaşımı' },
    { icon: 'handshake', text: 'Partner yönlendirmeleri açıkça belirtilir' },
    { icon: 'info', text: 'Finansal tavsiye değildir — bilgilendirme amaçlıdır' }
  ];

  return `
    <section class="ib-trust-layer ib-trust-layer--${variant}" aria-label="Güven ve uyum">
      <ul class="ib-trust-layer-grid">
        ${items
          .map(
            (item) =>
              `<li><i data-lucide="${item.icon}" aria-hidden="true"></i><span>${item.text}</span></li>`
          )
          .join('')}
      </ul>
    </section>`;
}
