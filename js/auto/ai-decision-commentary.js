/**
 * Structured AI decision commentary for /auto results.
 * Scores/TCO/ranking remain rule-based; AI only narrates structured sections.
 */

import { escapeHtml } from '../core/security.js';
import { formatMoney } from '../core/format.js';
import { sanitizeAiNarrative } from '../engines/decision-consultant.js';
import { buildDecisionInsight, normalizeInsightInput } from '../features/ai/ai-insight-engine.js';
import { getResultsPlanContext } from '../features/billing/paywall-v1.js';
import { buildExplanationBundle } from '../features/moat/ai-explanation-experience.js';

export const COMMENTARY_SCHEMA_KEYS = [
  'executive_summary',
  'profile_fit',
  'budget_assessment',
  'ownership_cost_commentary',
  'maintenance_commentary',
  'insurance_kasko_commentary',
  'fuel_energy_commentary',
  'depreciation_commentary',
  'financing_commentary',
  'main_risks',
  'why_recommended',
  'why_not_alternatives',
  'alternative_considerations',
  'next_best_action',
  'confidence_level',
  'disclaimer'
];

const SECTION_UI = [
  { key: 'executive_summary', title: 'Özet karar', icon: 'summary' },
  { key: 'profile_fit', title: 'Profil uyumu', icon: 'profile' },
  { key: 'budget_assessment', title: 'Bütçe değerlendirmesi', icon: 'budget' },
  { key: 'ownership_cost_commentary', title: 'Toplam sahip olma maliyeti', icon: 'tco' },
  { key: 'maintenance_commentary', title: 'Bakım maliyeti', icon: 'maintenance' },
  { key: 'insurance_kasko_commentary', title: 'Sigorta / kasko', icon: 'insurance' },
  { key: 'fuel_energy_commentary', title: 'Yakıt / enerji', icon: 'fuel' },
  { key: 'depreciation_commentary', title: 'Değer kaybı ve likidite', icon: 'depreciation' },
  { key: 'financing_commentary', title: 'Finansman etkisi', icon: 'finance' },
  { key: 'main_risks', title: 'Riskler', icon: 'risk', list: true },
  { key: 'why_recommended', title: 'Neden uygun?', icon: 'why', list: true },
  { key: 'why_not_alternatives', title: 'Alternatif bakış', icon: 'alt', list: true },
  { key: 'alternative_considerations', title: 'Ne zaman alternatif?', icon: 'when', list: true },
  { key: 'next_best_action', title: 'Sonraki adım', icon: 'next' },
  { key: 'confidence_level', title: 'Güven seviyesi', icon: 'confidence' },
  { key: 'disclaimer', title: 'Sınırlar', icon: 'disclaimer' }
];

const CONFIDENCE_LEVELS = new Set(['yüksek', 'orta', 'düşük']);

function sanitizeLine(text, max = 480) {
  return sanitizeAiNarrative(String(text || ''), max);
}

function sanitizeList(items, maxItems = 5, maxItem = 220) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => sanitizeLine(item, maxItem))
    .filter(Boolean)
    .slice(0, maxItems);
}

function leaderCosts(leader) {
  const own = leader?.costs?.ownership?.totals || {};
  const c = leader?.costs || {};
  return {
    months12: Number(own.months12 || c.total || 0),
    months36: Number(own.months36 || 0),
    fuel: Number(c.fuel || 0),
    insurance: Number(c.insurance || 0),
    kasko: Number(c.kasko || 0),
    maintenance: Number(c.maintenance || 0),
    depreciation: Number(c.depreciation || 0),
    tax: Number(c.tax || 0),
    liquidity: leader?.costs?.ownership?.depreciation?.liquidityScore
  };
}

/**
 * Rule-based structured commentary — always available as fallback.
 */
export function buildDeterministicDecisionCommentary(results = [], formData = {}) {
  const list = (Array.isArray(results) ? results : []).slice(0, 3);
  const leader = list[0] || null;
  const alt = list[1] || null;
  const bundle = buildExplanationBundle(list, formData);
  const costs = leader ? leaderCosts(leader) : null;
  const budget = Number(formData.budget || 0);
  const monthly = costs?.months12 > 0 ? Math.round(costs.months12 / 12) : 0;

  const confidenceTier = leader?.confidenceMeta?.tier || 'unknown';
  const confidence_level =
    confidenceTier === 'high' ? 'yüksek' : confidenceTier === 'medium' ? 'orta' : 'düşük';

  const { planTier } = getResultsPlanContext();

  const insightInput = normalizeInsightInput({
    vertical: 'auto',
    answers: formData,
    scores: { decision: leader?.score, overallRisk: leader?.risks?.length >= 2 ? 'Orta' : 'Düşük' },
    costs: costs ? { budget: formData.budget, tco12: costs.months12 } : {},
    risks: leader?.risks || [],
    recommendation: { name: leader?.name },
    planTier
  });
  const autoInsight = buildDecisionInsight(insightInput);
  const executive_summary = leader
    ? autoInsight.summary
    : 'Profil girdilerine göre referans modeller sıralandı; bağlayıcı satın alma önerisi değildir.';

  const profile_fit = bundle.profileSummary || 'Profil özeti sınırlı — sonuçları teklif doğrulaması ile okuyun.';

  const budget_assessment =
    budget > 0 && leader?.price
      ? `Bütçe hedefiniz ${formatMoney(budget)}; lider seçenek referans fiyatı ${formatMoney(leader.price)}. Uyum skoru bütçe içinde kalma ihtimalini yansıtır; canlı piyasa fiyatı teklifte netleşir.`
      : budget > 0
        ? `Bütçe hedefi ${formatMoney(budget)}. Aylık nakit etkisi için finansman ve sigorta kalemlerini birlikte değerlendirin.`
        : 'Bütçe girilmediği için maliyet senaryoları daha geniş bir bantta okunmalıdır.';

  const ownership_cost_commentary = costs?.months12
    ? `Kural tabanlı 12 ay toplam yük yaklaşık ${formatMoney(costs.months12)} (aylık etki ~${formatMoney(monthly)}). Bu tahmindir; vergi, kullanım ve sigorta profilinize göre değişir.`
    : 'Toplam sahip olma maliyeti katalog tahminine dayanır; teklif aşamasında doğrulanmalıdır.';

  const maintenance_commentary = costs?.maintenance
    ? `Bakım kalemi senaryoda ${formatMoney(costs.maintenance)} / yıl bandında. Yoğun şehir içi kullanımda periyodik bakım payı artabilir.`
    : 'Bakım maliyeti segment ve yaş varsayımlarına bağlıdır; servis geçmişi teklifte belirleyicidir.';

  const insurance_kasko_commentary =
    costs?.insurance || costs?.kasko
      ? `Sigorta ${formatMoney(costs.insurance)} ve kasko ${formatMoney(costs.kasko)} senaryo kalemleridir — bağlayıcı poliçe primi değildir.`
      : 'Sigorta ve kasko primleri profil, il ve hasar geçmişine göre değişir; partner teklifi ile netleşir.';

  const fuel_energy_commentary = costs?.fuel
    ? `Yakıt/enerji kalemi yıllık ~${formatMoney(costs.fuel)} (kullanım ve yakıt tercihinize göre). Uzun yol payı artarsa bu kalem baskın olabilir.`
    : 'Yakıt veya enerji maliyeti kullanım tipine bağlıdır; yıllık km ve şehir içi oranı belirleyicidir.';

  const depreciation_commentary =
    costs?.depreciation > 0
      ? `Değer kaybı senaryosu ${formatMoney(costs.depreciation)}. ${
          costs.liquidity != null ? `Likidite skoru ${costs.liquidity}/100 (kural tabanlı).` : ''
        } Kısa süreli kullanımda bu kalem daha belirleyici olur.`
      : 'Değer kaybı ve ikinci el likidite; tutma süresi ve segment talebine bağlıdır.';

  const financing_commentary =
    formData.loan === 'yes'
      ? 'Finansman senaryosu açık — aylık taksit ve toplam geri ödeme banka onayına tabidir; buradaki rakamlar simülasyondur.'
      : 'Peşin veya kısıtlı finansman senaryosunda nakit çıkışı ön planda; kredi açmayı planlıyorsanız teklifte faiz ve vade netleşmelidir.';

  const main_risks = [
    ...(leader?.risks || []).slice(0, 2).map((r) => sanitizeLine(r, 160)),
    bundle.uncertainty?.tier === 'review'
      ? 'Veri güven bandı sınırlı — manuel teklif doğrulaması önerilir.'
      : 'Canlı ilan fiyatı ve bağlayıcı kredi onayı gösterilmez.'
  ].filter(Boolean);

  const why_recommended = (leader?.reasons || []).slice(0, 3).map((r) => sanitizeLine(r, 160));
  if (!why_recommended.length && leader) {
    why_recommended.push('Kasa, yakıt ve kullanım profiline göre kural motoru uyum skoru oluşturdu.');
  }

  const why_not_alternatives = alt
    ? [
        alt.runnerContrast?.summary ||
          `${alt.name} alternatif olarak ${alt.score}/100 ile yakın — TCO ve finansman yükünü karşılaştırın.`
      ]
    : ['Alternatif havuz sınırlı — karşılaştırma matrisini birlikte okuyun.'];

  const alternative_considerations = [
    bundle.tradeoffs?.[0]?.summary || 'Skor farkı dar ise test sürüşü ve teklif toplama önceliklidir.',
    'Farklı yakıt veya kasa tercihi toplam maliyeti değiştirebilir.'
  ].filter(Boolean);

  const next_best_action =
    'Ücretsiz ön değerlendirme için iletişim bırakın; finansman, sigorta ve bayi teklifleri partner akışında netleşir — zorunlu satın alma yoktur.';

  const disclaimer =
    'Bu içerik karar destek analizidir; yatırım, kredi veya sigorta tavsiyesi değildir. Skor ve maliyet kalemleri kural motorundan gelir; AI yorumu sentez katmanıdır.';

  return {
    executive_summary: sanitizeLine(executive_summary, 520),
    profile_fit: sanitizeLine(profile_fit, 400),
    budget_assessment: sanitizeLine(budget_assessment, 400),
    ownership_cost_commentary: sanitizeLine(ownership_cost_commentary, 400),
    maintenance_commentary: sanitizeLine(maintenance_commentary, 320),
    insurance_kasko_commentary: sanitizeLine(insurance_kasko_commentary, 320),
    fuel_energy_commentary: sanitizeLine(fuel_energy_commentary, 320),
    depreciation_commentary: sanitizeLine(depreciation_commentary, 400),
    financing_commentary: sanitizeLine(financing_commentary, 320),
    main_risks: sanitizeList(main_risks),
    why_recommended: sanitizeList(why_recommended),
    why_not_alternatives: sanitizeList(why_not_alternatives),
    alternative_considerations: sanitizeList(alternative_considerations),
    next_best_action: sanitizeLine(next_best_action, 320),
    confidence_level,
    disclaimer: sanitizeLine(disclaimer, 400)
  };
}

export function parseStructuredCommentary(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let parsed;
  const trimmed = raw.trim();
  const jsonSlice =
    trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonSlice) return null;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const out = {};
  for (const key of COMMENTARY_SCHEMA_KEYS) {
    if (key === 'main_risks' || key === 'why_recommended' || key === 'why_not_alternatives' || key === 'alternative_considerations') {
      out[key] = sanitizeList(parsed[key]);
    } else if (key === 'confidence_level') {
      const level = String(parsed[key] || '')
        .toLowerCase()
        .trim();
      out[key] = CONFIDENCE_LEVELS.has(level) ? level : 'orta';
    } else {
      out[key] = sanitizeLine(parsed[key], key === 'executive_summary' ? 520 : 400);
    }
  }
  if (!out.executive_summary) return null;
  return out;
}

export function mergeCommentary(ai, deterministic) {
  const base = deterministic || buildDeterministicDecisionCommentary();
  if (!ai) return { data: base, source: 'rules' };
  const merged = { ...base };
  for (const key of COMMENTARY_SCHEMA_KEYS) {
    if (Array.isArray(base[key])) {
      if (Array.isArray(ai[key]) && ai[key].length) merged[key] = ai[key];
    } else if (ai[key]) {
      merged[key] = ai[key];
    }
  }
  return { data: merged, source: 'ai' };
}

export function buildCommentaryPrompt(results, formData, bundle, refinement = '') {
  const list = (results || []).slice(0, 3);
  const leader = list[0];
  const ctx = {
    profile: bundle.profileSummary,
    leader: leader
      ? { name: leader.name, score: leader.score, confidence: leader.confidenceMeta?.label }
      : null,
    alternatives: list.slice(1).map((v) => ({ name: v.name, score: v.score })),
    financial_note: bundle.financial?.comparativeNote,
    uncertainty: (bundle.uncertainty?.bullets || []).slice(0, 3),
    tradeoffs: (bundle.tradeoffs || []).map((t) => t.summary),
    usage: formData.usage,
    fuel: formData.fuel,
    body: formData.body,
    loan: formData.loan,
    budget_band: Number(formData.budget || 0) > 0 ? 'provided' : 'missing'
  };

  return [
    'Görev: Otomotiv karar analisti olarak YALNIZCA geçerli JSON üret (başka metin yok).',
    'Dil: Türkçe, profesyonel, net, pazarlama abartısı yok.',
    'YASAK: yeni fiyat, faiz %, banka adı, sigorta teklifi, kampanya, "kesin al", "en ucuz", kaynak uydurma.',
    'İZİNLİ: verilen skor/segment/belirsizlik ifadelerini yorumla; rakam yazacaksan yalnızca "ekranda gösterilen tahminler" de.',
    'Skor ve sıralama kural tabanlıdır — değiştirme iddiası yok.',
    'confidence_level: yüksek | orta | düşük (tek kelime).',
    'Anahtarlar: ' + COMMENTARY_SCHEMA_KEYS.join(', '),
    'main_risks, why_recommended, why_not_alternatives, alternative_considerations: string dizisi (en fazla 4 madde).',
    'Bağlam (JSON): ' + JSON.stringify(ctx),
    refinement ? 'Kullanıcı rafine isteği: ' + refinement : ''
  ].join('\n');
}

export function renderStructuredCommentaryPanel(commentary, options = {}) {
  const state = options.state || 'ready';
  const source = options.source || 'rules';
  const data = commentary || buildDeterministicDecisionCommentary();

  const stateLabel =
    state === 'loading'
      ? 'Karar yorumu oluşturuluyor…'
      : state === 'error'
        ? 'AI yorumu üretilemedi — kural tabanlı analiz gösteriliyor'
        : state === 'fallback'
          ? 'AI yorumu geçici olarak sınırlı — temel analiz gösteriliyor'
          : source === 'ai'
            ? 'AI destekli karar yorumu'
            : 'Kural tabanlı karar yorumu';

  const sectionsHtml = SECTION_UI.map((section, idx) => {
    const value = data[section.key];
    const open = idx < 3 ? ' open' : '';
    let body = '';
    if (section.list && Array.isArray(value) && value.length) {
      body = `<ul class="ib-ai-commentary-list">${value.map((li) => `<li>${escapeHtml(li)}</li>`).join('')}</ul>`;
    } else if (section.list) {
      body = '<p class="text-muted-sm">Bu bölüm için yeterli sinyal yok.</p>';
    } else {
      body = `<p>${escapeHtml(value || '—')}</p>`;
    }
    return `
      <details class="ib-ai-commentary-section"${open} data-commentary-section="${section.key}">
        <summary>${escapeHtml(section.title)}</summary>
        <div class="ib-ai-commentary-body">${body}</div>
      </details>`;
  }).join('');

  return `
    <section class="ib-ai-structured-commentary" data-ai-commentary-root data-state="${escapeHtml(state)}" data-source="${escapeHtml(source)}">
      <header class="ib-ai-commentary-header">
        <div>
          <h4>AI Uzman Yorumu</h4>
          <p class="ib-ai-commentary-lead text-muted-sm">
            Bu yorum; form cevaplarınız, maliyet tahminleri ve karar skorları üzerinden oluşturulan karar destek analizidir.
            Skorlar kural motorundan gelir; AI yalnızca açıklama ve sentez üretir.
          </p>
        </div>
        <span class="ib-ai-commentary-badge" data-commentary-status>${escapeHtml(stateLabel)}</span>
      </header>
      <div class="ib-ai-commentary-lanes" aria-label="Veri kaynağı ayrımı">
        <span class="ib-ai-lane-pill ib-ai-lane-pill--rule">Kural skoru</span>
        <span class="ib-ai-lane-pill ib-ai-lane-pill--estimate">Tahmin kalemleri</span>
        <span class="ib-ai-lane-pill ib-ai-lane-pill--ai">AI yorumu</span>
      </div>
      <div class="ib-ai-commentary-sections" data-commentary-sections>
        ${sectionsHtml}
      </div>
      <div class="ib-ai-commentary-actions">
        <button type="button" class="btn primary btn-sm" data-ai-next-action>
          Teklif sürecini başlat
        </button>
      </div>
      <p class="ib-ai-commentary-disclaimer text-muted-sm">${escapeHtml(data.disclaimer || '')}</p>
      <button type="button" class="btn btn-ghost btn-sm ib-ai-commentary-retry hidden" data-ai-commentary-retry>Yorumu yeniden dene</button>
    </section>`;
}

export function hydrateStructuredCommentary(root, commentary, options = {}) {
  const panel = root?.querySelector?.('[data-ai-commentary-root]');
  if (!panel) return;
  const sections = panel.querySelector('[data-commentary-sections]');
  const status = panel.querySelector('[data-commentary-status]');
  const retry = panel.querySelector('[data-ai-commentary-retry]');

  panel.dataset.state = options.state || 'ready';
  panel.dataset.source = options.source || 'rules';

  if (status) {
    status.textContent =
      options.state === 'loading'
        ? 'Karar yorumu oluşturuluyor…'
        : options.state === 'error'
          ? 'AI yorumu üretilemedi — kural tabanlı analiz'
          : options.state === 'fallback'
            ? 'AI yorumu geçici olarak sınırlı — temel analiz'
          : options.source === 'ai'
            ? 'AI destekli karar yorumu'
            : 'Kural tabanlı karar yorumu';
  }

  if (sections && commentary) {
    sections.innerHTML = SECTION_UI.map((section, idx) => {
      const value = commentary[section.key];
      const open = idx < 3 ? ' open' : '';
      let body = '';
      if (section.list && Array.isArray(value) && value.length) {
        body = `<ul class="ib-ai-commentary-list">${value.map((li) => `<li>${escapeHtml(li)}</li>`).join('')}</ul>`;
      } else if (section.list) {
        body = '<p class="text-muted-sm">Bu bölüm için yeterli sinyal yok.</p>';
      } else {
        body = `<p>${escapeHtml(value || '—')}</p>`;
      }
      return `
        <details class="ib-ai-commentary-section"${open} data-commentary-section="${section.key}">
          <summary>${escapeHtml(section.title)}</summary>
          <div class="ib-ai-commentary-body">${body}</div>
        </details>`;
    }).join('');
  }

  retry?.classList.toggle('hidden', !['error', 'fallback'].includes(options.state || 'ready'));
}

export const AI_COMMENTARY_TIMEOUT_MS = 10_000;

export const AI_COMMENTARY_STORAGE_KEY = 'istebul_auto_ai_summary';
