/**
 * P3.5 Premium AI explanation experience — deterministic structure + bounded narration.
 * LLM fills only the synthesis slot; scores/TCO/ranking never come from AI.
 */

import { escapeHtml } from '../../core/security.js';
import { formatMoney } from '../../core/format.js';

const USAGE_LABELS = {
  family: 'Aile kullanımı',
  city: 'Şehir kullanımı',
  long: 'Uzun yol',
  mixed: 'Karma kullanım'
};

const FUEL_LABELS = {
  electric: 'Elektrik',
  hybrid: 'Hibrit',
  gasoline: 'Benzin',
  diesel: 'Dizel',
  any: 'Esnek'
};

const BODY_LABELS = {
  suv: 'SUV',
  sedan: 'Sedan',
  hatchback: 'Hatchback'
};

export function buildExplanationBundle(results = [], formData = {}) {
  const list = (Array.isArray(results) ? results : []).slice(0, 3);
  const leader = list[0] || null;
  const meta = leader?.confidenceMeta || {};
  const tradeoffs = leader?.rankIntelligence?.tradeoffs || [];

  const profileSummary = buildProfileSummary(formData);
  const reasoning = buildStructuredReasoning(list, formData, leader);
  const financial = buildFinancialReasoning(list);
  const rationales = buildRecommendationRationales(list);
  const uncertainty = buildUncertaintyPanel(leader, formData, list);

  return {
    identity: {
      title: 'Karar asistanı',
      subtitle: 'Tahmin makinesi değil — deterministik skor + sınırlı yorum katmanı',
      badge: 'AI decision assistant'
    },
    profileSummary,
    reasoning,
    financial,
    rationales,
    tradeoffs,
    uncertainty,
    leaderName: leader?.name || null
  };
}

function buildProfileSummary(formData = {}) {
  const parts = [];
  const budget = Number(formData.budget || 0);
  if (budget > 0) parts.push(`Bütçe hedefi ${formatMoney(budget)}`);
  if (formData.body && BODY_LABELS[formData.body]) parts.push(BODY_LABELS[formData.body]);
  if (formData.fuel && FUEL_LABELS[formData.fuel]) parts.push(FUEL_LABELS[formData.fuel]);
  if (formData.usage && USAGE_LABELS[formData.usage]) parts.push(USAGE_LABELS[formData.usage]);
  if (formData.loan === 'yes') parts.push('Finansman senaryosu açık');
  return parts.length ? parts.join(' · ') : 'Profil özeti sınırlı — sonuçlar geniş senaryo bandında';
}

function buildStructuredReasoning(results, formData, leader) {
  const steps = [
    {
      id: 'match',
      title: '1. Profil → model eşleştirme',
      detail:
        'Referans katalogdan kasa, yakıt ve kullanım kriterlerinize göre havuz daraltıldı. Bu adım ilan araması değil, uyum filtresidir.'
    },
    {
      id: 'score',
      title: '2. Uyum skoru (kural motoru)',
      detail: leader
        ? `${leader.name} için ${leader.score}/100 uyum skoru şeffaf faktörlerle hesaplandı — yapay zeka skoru üretmez.`
        : 'Uyum skoru şeffaf faktörlerle hesaplanır; yapay zeka skoru üretmez.'
    },
    {
      id: 'tco',
      title: '3. TCO ve finansman bağlamı',
      detail:
        '12 aylık toplam sahip olma maliyeti kural tabanlıdır. Finansman blokları simülasyondur; banka onayı ayrı değerlendirilir.'
    },
    {
      id: 'rank',
      title: '4. Sıralama ve alternatifler',
      detail: leader?.rankExplanation?.summary
        ? leader.rankExplanation.summary
        : 'Lider ve alternatifler arasındaki farklar faktör düzeyinde açıklanır; kesin satın alma önerisi değildir.'
    }
  ];

  if (leader?.matchTier && leader.matchTier !== 'strict') {
    steps.push({
      id: 'coverage',
      title: '5. Katalog kapsamı notu',
      detail:
        leader.matchTier === 'broad'
          ? 'Tam eşleşme az olduğu için havuz genişletildi — sonuçları teklif doğrulaması ile birlikte okuyun.'
          : 'Kısmi eşleşme ile havuz genişletildi — yakıt/kasa tercihinizi tekrar kontrol edin.'
    });
  }

  return steps;
}

function buildFinancialReasoning(results = []) {
  const rows = results.map((v, idx) => {
    const total = Number(v.costs?.total || 0);
    const monthly = total > 0 ? Math.round(total / 12) : 0;
    return {
      rank: idx + 1,
      name: v.name,
      score: v.score,
      tco12: total,
      monthly,
      costLabel: v.costs?.source === 'truth' ? 'Doğrulanmış maliyet katmanı' : 'Tahmini maliyet'
    };
  });

  let comparativeNote = 'TCO senaryoları karar skorundan bağımsız okunmalıdır.';
  if (rows.length >= 2 && rows[0].tco12 > 0 && rows[1].tco12 > 0) {
    const diff = Math.abs(rows[0].tco12 - rows[1].tco12);
    const pct = Math.round((diff / Math.max(rows[0].tco12, rows[1].tco12)) * 100);
    if (pct >= 8) {
      const cheaper = rows[0].tco12 < rows[1].tco12 ? rows[0].name : rows[1].name;
      comparativeNote = `${cheaper} 12 aylık TCO senaryosunda yaklaşık %${pct} daha düşük — uyum skoru tek başına yeterli değil.`;
    } else {
      comparativeNote = 'İlk iki seçenek TCO açısından yakın — finansman yükü ve kullanım önceliği belirleyici olabilir.';
    }
  }

  return { rows, comparativeNote };
}

function buildRecommendationRationales(results = []) {
  return results.map((v, idx) => ({
    rank: idx + 1,
    name: v.name,
    score: v.score,
    reasons: (v.reasons || []).slice(0, 3),
    risks: (v.risks || []).slice(0, 2),
    confidenceLabel: v.confidenceMeta?.label || 'Veri güven bandı değerlendiriliyor',
    runnerNote: idx > 0 ? v.runnerContrast?.summary : null
  }));
}

function buildUncertaintyPanel(leader, formData, results) {
  const meta = leader?.confidenceMeta;
  const bullets = [
    'Skor ve sıralama deterministik kural motorundandır; AI tahmin üretmez.',
    'Canlı ilan fiyatı veya bağlayıcı kredi onayı gösterilmez.',
    'Partner teklifleri piyasa koşullarına göre değişir — sonuçlar metodolojik destektir.'
  ];

  if (meta?.tier === 'review') {
    bullets.unshift('Veri güven bandı sınırlı — manuel teklif doğrulaması önerilir.');
  } else if (meta?.tier === 'medium') {
    bullets.unshift('Orta veri güven bandı — finansman ve fiyat teklifte doğrulanmalı.');
  }

  if (!Number(formData.budget || 0)) {
    bullets.push('Bütçe girilmediği için senaryo belirsizliği daha yüksektir.');
  }

  const scoreSpread =
    results.length >= 2 ? Number(results[0].score || 0) - Number(results[1].score || 0) : 99;
  if (scoreSpread <= 6) {
    bullets.push('Lider ve ikinci seçenek skoru yakın — kesin sıralama iddiası yok; karşılaştırmalı test önerilir.');
  }

  return {
    tier: meta?.tier || 'unknown',
    label: meta?.label || 'Güven bandı hesaplanıyor',
    disclaimer: meta?.disclaimer || '',
    bullets
  };
}

export function buildDeterministicSynthesis(bundle) {
  const b = bundle || {};
  if (!b.leaderName) {
    return 'Profilinize göre referans modeller sıralandı. Yapılandırılmış gerekçe ve TCO tablosu kural motorundan gelir; kesin sonuç iddiası yoktur.';
  }
  const trade = b.tradeoffs?.[0]?.summary;
  const uncertain =
    b.uncertainty?.tier === 'review'
      ? 'Veri güven bandı sınırlı — teklif doğrulaması önerilir.'
      : 'Finansman ve canlı fiyat teklif aşamasında netleşir.';
  return `${b.leaderName} profil uyumunda öne çıkıyor. ${trade ? `${trade} ` : ''}${uncertain} Bu metin tahmin değil; deterministik özet desteğidir.`;
}

export function renderAiExplanationExperience(bundle, options = {}) {
  const b = bundle || buildExplanationBundle();
  const pro = Boolean(options.pro);
  const lockedClass = pro ? '' : ' ib-ai-experience--locked';
  const synthesisText = pro
    ? 'Yorum katmanı hazırlanıyor — sayılar kartlardan gelir.'
    : buildDeterministicSynthesis(b);

  return `
    <section class="ib-ai-experience premium-ai-summary ai-explanation-box${lockedClass}" data-ai-explanation>
      <header class="ib-ai-experience-header">
        <div>
          <p class="kicker">${escapeHtml(b.identity.badge)}</p>
          <h3>${escapeHtml(b.identity.title)}</h3>
          <p class="ib-ai-experience-subtitle">${escapeHtml(b.identity.subtitle)}</p>
        </div>
        <span class="ib-ai-experience-badge" aria-hidden="true">Kural + yorum</span>
      </header>

      <p class="ib-ai-profile-chip">${escapeHtml(b.profileSummary)}</p>

      <div class="ib-ai-synthesis-card" data-ai-synthesis-card>
        <h4>Danışman sentezi</h4>
        <p class="ai-explanation-lead" data-ai-synthesis>${escapeHtml(synthesisText)}</p>
        <p class="ib-ai-synthesis-hint text-muted-sm">Bu paragraf tek AI çıktısıdır; skor ve TCO değiştirilmez.</p>
      </div>

      <div class="ib-ai-grid">
        <section class="ib-ai-panel" aria-label="Yapılandırılmış akıl yürütme">
          <h4>Yapılandırılmış akıl yürütme</h4>
          <ol class="ib-ai-reasoning-list">
            ${b.reasoning
              .map(
                (step) => `
              <li>
                <strong>${escapeHtml(step.title)}</strong>
                <span>${escapeHtml(step.detail)}</span>
              </li>`
              )
              .join('')}
          </ol>
        </section>

        <section class="ib-ai-panel ib-ai-panel--financial" aria-label="Finansal bağlam">
          <h4>Finansal bağlam (kural tabanlı)</h4>
          <p class="text-muted-sm">${escapeHtml(b.financial.comparativeNote)}</p>
          <div class="ib-ai-finance-table">
            ${b.financial.rows
              .map(
                (row) => `
              <div class="ib-ai-finance-row">
                <span class="ib-ai-finance-rank">#${row.rank}</span>
                <div class="ib-ai-finance-main">
                  <strong>${escapeHtml(row.name)}</strong>
                  <small>${escapeHtml(row.costLabel)} · uyum ${row.score}/100</small>
                </div>
                <div class="ib-ai-finance-metrics">
                  <span>12 ay TCO <b>${formatMoney(row.tco12)}</b></span>
                  <span>Aylık etki <b>${formatMoney(row.monthly)}</b></span>
                </div>
              </div>`
              )
              .join('')}
          </div>
        </section>
      </div>

      ${
        b.tradeoffs?.length
          ? `<section class="ib-ai-panel" aria-label="Trade-off kartları">
          <h4>Trade-off özeti</h4>
          <div class="ib-ai-tradeoff-cards">
            ${b.tradeoffs
              .map(
                (t) => `
              <article class="ib-ai-tradeoff-card">
                <strong>${escapeHtml(t.title)}</strong>
                <p>${escapeHtml(t.summary)}</p>
              </article>`
              )
              .join('')}
          </div>
        </section>`
          : ''
      }

      <section class="ib-ai-panel" aria-label="Öneri gerekçeleri">
        <h4>Öneri gerekçeleri (deterministik)</h4>
        <div class="ib-ai-rationale-grid">
          ${b.rationales
            .map(
              (r) => `
            <article class="ib-ai-rationale-card">
              <header>
                <span>#${r.rank}</span>
                <strong>${escapeHtml(r.name)}</strong>
                <em>${r.score}/100</em>
              </header>
              <p class="ib-ai-rationale-confidence">${escapeHtml(r.confidenceLabel)}</p>
              ${
                r.reasons.length
                  ? `<ul class="positive">${r.reasons.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
                  : ''
              }
              ${
                r.risks.length
                  ? `<ul class="negative">${r.risks.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
                  : ''
              }
              ${r.runnerNote ? `<p class="ib-ai-runner-note">${escapeHtml(r.runnerNote)}</p>` : ''}
            </article>`
            )
            .join('')}
        </div>
      </section>

      <aside class="ib-ai-uncertainty" role="note" aria-label="Belirsizlik ve sınırlar">
        <h4>Belirsizlik ve sınırlar</h4>
        <p class="ib-ai-uncertainty-tier">${escapeHtml(b.uncertainty.label)}</p>
        <ul>
          ${b.uncertainty.bullets.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
        </ul>
        ${
          b.uncertainty.disclaimer
            ? `<p class="text-muted-sm">${escapeHtml(b.uncertainty.disclaimer)}</p>`
            : ''
        }
      </aside>

      <div class="ai-refinement-tools" ${pro ? '' : 'hidden'}>
        <div class="ai-refinement-chips">
          <button type="button" class="ai-chip" data-ai-refine="Daha ekonomik alternatifleri yorumla; sayı ekleme.">
            Daha ekonomik
          </button>
          <button type="button" class="ai-chip" data-ai-refine="Sedan odaklı trade-off yorumla; sayı ekleme.">
            Sedan odaklı
          </button>
          <button type="button" class="ai-chip" data-ai-refine="Hybrid önceliği ve belirsizlikleri yorumla.">
            Hybrid odaklı
          </button>
          <button type="button" class="ai-chip" data-ai-refine="Aylık bütçe baskısı ve finansman belirsizliğini yorumla.">
            Aylık bütçe
          </button>
        </div>
        <div class="ai-refinement-input">
          <input type="text" id="ai-refinement-input" placeholder="Kararı rafine edin (yalnızca yorum — skor değişmez)" maxlength="240" />
          <button type="button" class="btn primary" id="ai-refinement-submit">Sentezi güncelle</button>
        </div>
        <p class="ai-trust-note">
          Karar asistanı tahmin makinesi değildir. Yapay zeka yalnızca sentez paragrafını yazar; skor, sıra ve TCO kural motorundandır.
        </p>
      </div>
    </section>`;
}

export function updateExplanationSynthesis(root, text, options = {}) {
  const slot = root?.querySelector?.('[data-ai-synthesis]');
  if (!slot) return;
  const fallback =
    options.fallback ||
    'Sentez şu an üretilemedi. Yapılandırılmış gerekçe ve finansal tablo deterministik olarak geçerlidir.';
  slot.textContent = text?.trim() ? text : fallback;
}
