/**
 * Decision Intelligence Engine V3 — category-aware, explainable decision logic.
 * Falls back safely; does not replace domain cost engines in category V2 modules.
 */
import { escapeHtml } from '../../core/security.js';
import {
  buildExecutiveSummary,
  buildInsightInputFromIntelligence,
  fetchInsightWithProxy,
  sanitizeInsightText
} from '../ai/ai-insight-engine.js';
import {
  buildConfidenceScore,
  buildRiskItem,
  clampScore,
  resolveScoreLabel,
  riskLevelToTone
} from './results-engine.js';

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCategory(category) {
  const c = String(category || '').toLowerCase();
  if (c === 'sigorta' || c === 'insurance') return 'sigorta';
  if (c === 'kasko') return 'kasko';
  if (['auto', 'konut', 'tatil', 'finansman', 'sigorta', 'kasko'].includes(c)) return c;
  return 'konut';
}

function impactSigned(delta) {
  const n = Math.round(delta);
  if (n > 0) return `+${n}`;
  if (n < 0) return String(n);
  return '0';
}

function addFactor(factors, label, delta, reason) {
  if (!label || !reason) return;
  factors.push({
    label,
    impact: impactSigned(delta),
    reason
  });
}

function countHighRisks(riskAnalysis) {
  return (riskAnalysis || []).filter((r) => r.level === 'yüksek').length;
}

function overallRiskLabel(riskAnalysis) {
  const high = countHighRisks(riskAnalysis);
  if (high >= 2) return 'Yüksek';
  if (high === 1 || (riskAnalysis || []).some((r) => r.level === 'orta')) return 'Orta';
  return 'Düşük';
}

/**
 * @param {number} decisionScore
 * @param {object} context
 * @returns {'proceed'|'proceed_with_caution'|'wait'|'avoid'}
 */
export function resolveRecommendationLevel(decisionScore, context = {}) {
  const score = clampScore(decisionScore);
  const highRisks = countHighRisks(context.riskAnalysis);
  if (score >= 78 && highRisks === 0) return 'proceed';
  if (score >= 62 && highRisks <= 1) return 'proceed_with_caution';
  if (score >= 48) return 'wait';
  return 'avoid';
}

const RECOMMENDATION_LABELS = {
  proceed: 'İlerlenebilir',
  proceed_with_caution: 'Dikkatli ilerle',
  wait: 'Ertelenmeli / revize edilmeli',
  avoid: 'Şu an önerilmez'
};

/**
 * @param {'auto'|'konut'|'tatil'|'finansman'} category
 * @param {object} formData
 * @param {object} metrics
 * @param {object} [extras]
 */
export function buildDecisionContext(category, formData = {}, metrics = {}, extras = {}) {
  const cat = normalizeCategory(category);
  const state = formData || {};
  const m = metrics || {};
  const warnings = [];
  const scoreFactors = [];

  const base = {
    category: cat,
    formData: state,
    metrics: m,
    extras,
    warnings,
    scoreFactors
  };

  if (cat === 'konut') {
    const dti = safeNumber(m.dti);
    const monthly = safeNumber(m.ownership?.monthlyPayment);
    const capacity =
      safeNumber(state.monthlyCapacity) || safeNumber(state.monthlyIncome) * 0.35;
    const budget = safeNumber(state.totalBudget) || safeNumber(m.ownership?.homePrice);
    const sqm = safeNumber(state.squareMeters);
    const pricePerSqm = sqm > 0 && budget > 0 ? budget / sqm : null;
    const isInvestment = String(state.purchasePurpose || '').includes('Yatırım');
    const liquidity = safeNumber(m.liquidityRisk);
    const eq = safeNumber(m.earthquakeRiskScore);

    Object.assign(base, {
      city: state.city,
      district: state.district,
      dti,
      monthlyPayment: monthly,
      capacity,
      budget,
      pricePerSqm,
      isInvestment,
      liquidity,
      earthquakeRisk: eq,
      locationFit: safeNumber(m.locationFit),
      budgetFit: safeNumber(m.budgetFit),
      legacyScore: safeNumber(m.score)
    });

    if (dti > 45) warnings.push('Borç/gelir oranı yüksek görünüyor.');
    if (pricePerSqm && pricePerSqm > 85_000) warnings.push('m² birim maliyeti baskı oluşturabilir.');
    return base;
  }

  if (cat === 'finansman') {
    const primary = extras.primaryResult || m.primaryResult || null;
    const income = safeNumber(state.monthly_income);
    const debt = safeNumber(state.existing_debt);
    const monthly =
      safeNumber(primary?.metrics?.monthlyPayment) || safeNumber(m.monthlyPayment);
    const paymentToIncome = income > 0 ? ((monthly + debt) / income) * 100 : 100;
    const months =
      safeNumber(m.termMonths) ||
      (state.term_months === '60' ? 60 : state.term_months === '24' ? 24 : 36);

    Object.assign(base, {
      income,
      debt,
      monthlyPayment: monthly,
      paymentToIncome,
      termMonths: months,
      cashPressure: primary?.metrics?.cashPressure || m.cashPressure,
      legacyScore: 0
    });

    if (paymentToIncome > 45) warnings.push('Aylık ödeme/gelir oranı sınırın üzerinde modelleniyor.');
    return base;
  }

  if (cat === 'tatil') {
    const primary = extras.primaryResult || m.primaryResult || null;
    const travelers = safeNumber(state.travelers_count) || 2;
    const childFamily = state.people_type === 'cocuklu-aile';
    const flex = state.date_flexibility;
    const budgetTarget =
      state.budget_range === 'manuel' ?
        safeNumber(state.budget_total || state.budget_manual)
      : safeNumber(primary?.costs?.realTotal) || 100_000;
    const totalCost = safeNumber(primary?.costs?.realTotal) || budgetTarget * 1.08;

    Object.assign(base, {
      travelers,
      childFamily,
      dateFlexibility: flex,
      budgetTarget,
      totalCost,
      transport: state.transport_preference,
      comfort: state.comfort_expectation,
      tripNights: safeNumber(state.trip_nights),
      legacyScore: safeNumber(primary?.score)
    });

    if (totalCost > budgetTarget * 1.12) {
      warnings.push('Toplam tatil maliyeti hedef bütçeyi aşabilir.');
    }
    return base;
  }

  // auto
  const topResult = extras.topResult || m.topResult || {};
  const budget = safeNumber(state.budget || extras.budget);
  const totalCost = safeNumber(
    topResult?.costs?.ownership?.totals?.months12 || topResult?.costs?.total || extras.totalCost
  );
  const usage = String(state.usage || '').trim();
  const fuel = String(topResult.fuel || state.fuel || '').trim();

  Object.assign(base, {
    budget,
    totalCost,
    vehiclePrice: safeNumber(topResult.price),
    usage,
    fuel,
    km: safeNumber(state.km),
    loan: String(state.loan || ''),
    cautions: extras.cautions || topResult.risks || [],
    legacyScore: safeNumber(topResult.score)
  });

  if (totalCost && budget && totalCost > budget * 1.08) {
    warnings.push('12 ay TCO bütçe hedefinin üzerinde modelleniyor.');
  }

  return base;
}

/**
 * @param {'auto'|'konut'|'tatil'|'finansman'} category
 * @param {object} context
 */
export function computeDecisionScoreV3(category, context = {}) {
  const cat = normalizeCategory(category || context.category);
  const factors = [];
  let score = 68;

  if (cat === 'konut') {
    const dti = safeNumber(context.dti);
    const budgetFit = safeNumber(context.budgetFit) || 65;
    const locationFit = safeNumber(context.locationFit) || 60;
    const purpose = context.isInvestment ? 72 : 84;

    score = Math.round(
      budgetFit * 0.22 +
        locationFit * 0.18 +
        purpose * 0.1 +
        clampScore(100 - dti * 1.1) * 0.22 +
        clampScore(100 - safeNumber(context.liquidity) * 0.8) * 0.12 +
        clampScore(100 - safeNumber(context.earthquakeRisk) * 0.6) * 0.16
    );

    addFactor(factors, 'Bütçe/m² dengesi', budgetFit - 70, 'Bütçe ve konut tipi uyumu');
    addFactor(factors, 'Lokasyon sinyali', locationFit - 65, `${context.city || 'Bölge'} profili`);
    addFactor(
      factors,
      'Kredi yükü',
      dti > 40 ? -12 : dti > 32 ? -5 : 8,
      `Borç/gelir yaklaşık %${Math.round(dti)}`
    );
    addFactor(
      factors,
      'Oturum / yatırım',
      context.isInvestment ? -3 : 6,
      context.isInvestment ? 'Yatırım profili — likidite önemli' : 'Oturum amacı'
    );
  } else if (cat === 'finansman') {
    const pti = safeNumber(context.paymentToIncome);
    const months = safeNumber(context.termMonths) || 36;

    score = clampScore(88 - Math.max(0, pti - 28) * 1.35 - Math.max(0, months - 48) * 0.35);
    if (context.cashPressure === 'Yüksek') score -= 8;

    addFactor(
      factors,
      'Ödeme/gelir oranı',
      pti > 45 ? -14 : pti > 38 ? -6 : 10,
      `Aylık yük/gelir ~%${Math.round(pti)}`
    );
    addFactor(
      factors,
      'Vade yapısı',
      months > 48 ? -6 : months <= 24 ? 5 : 0,
      `${months} ay vade senaryosu`
    );
    addFactor(
      factors,
      'Nakit akışı',
      context.cashPressure === 'Yüksek' ? -8 : 6,
      `Nakit baskısı: ${context.cashPressure || 'Orta'}`
    );
  } else if (cat === 'tatil') {
    const ratio =
      context.budgetTarget > 0 ? context.totalCost / context.budgetTarget : 1.05;
    const flex = context.dateFlexibility;

    score = clampScore(80 - Math.max(0, ratio - 1) * 55 - (flex === 'undecided' ? 10 : 0));
    if (context.childFamily) score += 3;

    addFactor(
      factors,
      'Bütçe uyumu',
      ratio <= 1.05 ? 10 : ratio <= 1.15 ? -4 : -12,
      'Hedef bütçe ile toplam maliyet karşılaştırması'
    );
    addFactor(
      factors,
      'Sezon/esneklik',
      flex === 'net' ? 6 : flex === 'undecided' ? -8 : 2,
      'Tarih netliği ve yoğunluk riski'
    );
    addFactor(
      factors,
      'Çocuklu aile',
      context.childFamily ? 5 : 0,
      context.childFamily ? 'Aile uygunluğu öncelikli' : 'Genel profil'
    );
  } else {
    const budget = safeNumber(context.budget) || 1;
    const tco = safeNumber(context.totalCost);
    const pressure = tco / budget;
    const usageFit =
      context.usage === 'city' && context.fuel === 'electric' ? 10
      : context.usage === 'long' && ['diesel', 'hybrid'].includes(context.fuel) ? 7
      : 0;

    score = clampScore(
      76 - Math.max(0, pressure - 0.95) * 90 + usageFit - (context.fuel === 'electric' && context.km > 25000 ? 5 : 0)
    );

    addFactor(
      factors,
      'TCO / bütçe',
      pressure <= 1 ? 10 : pressure <= 1.08 ? -4 : -12,
      '12 ay toplam sahip olma maliyeti'
    );
    addFactor(
      factors,
      'Kullanım amacı',
      usageFit,
      context.usage ? `${context.usage} kullanım profili` : 'Kullanım belirtilmedi'
    );
    addFactor(
      factors,
      'Yakıt/enerji',
      context.fuel === 'electric' ? 4 : context.fuel === 'diesel' ? 2 : 0,
      context.fuel || 'Yakıt tipi'
    );
  }

  const legacy = safeNumber(context.legacyScore);
  if (legacy > 0 && cat !== 'finansman') {
    score = clampScore(Math.round(score * 0.55 + legacy * 0.45));
  }

  context.scoreFactors = factors;
  return clampScore(score);
}

/**
 * @param {'auto'|'konut'|'tatil'|'finansman'} category
 * @param {object} context
 */
export function computeConfidenceScoreV3(category, context = {}) {
  const cat = normalizeCategory(category || context.category);
  const state = context.formData || {};

  if (cat === 'konut') {
    return buildConfidenceScore(state, [
      { ok: Boolean(String(state.city || '').trim()), weight: 14 },
      { ok: Boolean(String(state.district || '').trim()), weight: 6 },
      { ok: safeNumber(state.totalBudget) > 0, weight: 14 },
      { ok: Boolean(state.homeType), weight: 10 },
      { ok: Boolean(state.purchasePurpose), weight: 10 },
      { ok: safeNumber(state.monthlyIncome) > 0, weight: 8 }
    ]);
  }

  if (cat === 'finansman') {
    return buildConfidenceScore(state, [
      { ok: Boolean(state.purpose), weight: 12 },
      { ok: Boolean(state.amount_range), weight: 14 },
      { ok: Boolean(state.term_months), weight: 12 },
      { ok: safeNumber(state.monthly_income) > 0, weight: 14 },
      { ok: Boolean(state.risk_tolerance), weight: 8 }
    ]);
  }

  if (cat === 'tatil') {
    return buildConfidenceScore(state, [
      { ok: Boolean(state.budget_range), weight: 14 },
      { ok: Boolean(state.people_type), weight: 12 },
      { ok: Boolean(state.date_start || state.date_period_note), weight: 12 },
      { ok: Boolean(state.transport_preference), weight: 10 },
      { ok: Boolean(state.comfort_expectation), weight: 10 }
    ]);
  }

  return buildConfidenceScore(state, [
    { field: 'budget', weight: 2 },
    { field: 'usage', weight: 2 },
    { field: 'body', weight: 1 },
    { field: 'fuel', weight: 1 },
    { field: 'km', weight: 1 },
    { field: 'loan', weight: 1 }
  ]);
}

/**
 * @param {'auto'|'konut'|'tatil'|'finansman'} category
 * @param {object} context
 */
export function buildRiskAnalysisV3(category, context = {}) {
  const cat = normalizeCategory(category || context.category);

  if (cat === 'konut') {
    const dti = safeNumber(context.dti);
    const creditLevel = dti > 45 ? 'yüksek' : dti > 32 ? 'orta' : 'düşük';
    return [
      buildRiskItem(
        'budget',
        context.monthlyPayment > context.capacity * 1.05 ? 'yüksek' : 'orta',
        'Bütçe ve kredi yükü',
        creditLevel === 'yüksek' ?
          'Aylık ödeme kapasite bandını zorlayabilir.'
        : 'Bütçe ile tahmini yük dengeli görünüyor.',
        'Peşinat ve vade senaryosu ile aylık yükü doğrulayın.'
      ),
      buildRiskItem(
        'location',
        safeNumber(context.earthquakeRisk) > 60 ? 'yüksek' : 'düşük',
        'İl/ilçe sinyali',
        `${context.city || 'Seçilen bölge'} için lokasyon ve deprem profili değerlendirildi.`,
        'Bölge fiyat trendi ve ulaşım altyapısını karşılaştırın.'
      ),
      buildRiskItem(
        'credit',
        creditLevel,
        'Kredi yükü',
        `Borç/gelir yaklaşık %${Math.round(dti)} seviyesinde modelleniyor.`,
        creditLevel === 'yüksek' ?
          'Kredi tutarını düşürün veya gelir belgesi ile ön görüşme yapın.'
        : 'Banka ön onayı alın.'
      ),
      buildRiskItem(
        'dues',
        safeNumber(context.metrics?.ownership?.dues) > 4000 ? 'orta' : 'düşük',
        'Aidat ve ek giderler',
        'Aidat ve bakım kalemleri toplam yükü etkiler.',
        'Yıllık aidat ve sigorta maliyetini tabloya ekleyin.'
      ),
      buildRiskItem(
        'liquidity',
        safeNumber(context.liquidity) > 55 ? 'yüksek' : 'düşük',
        'Likidite/satılabilirlik',
        'Satış süresi ve talep derinliği önemli.',
        '3 emsal ilan ile likidite testi yapın.'
      ),
      buildRiskItem(
        'depreciation',
        context.isInvestment ? 'orta' : 'düşük',
        'Değer kaybı riski',
        context.isInvestment ?
          'Yatırım profilinde boşluk ve segment riski izlenmeli.'
        : 'Oturum profilinde değer kaybı daha sınırlı olabilir.',
        'Bina yaşı ve emsal satış fiyatlarını kontrol edin.'
      )
    ];
  }

  if (cat === 'finansman') {
    const pti = safeNumber(context.paymentToIncome);
    const months = safeNumber(context.termMonths) || 36;
    return [
      buildRiskItem(
        'payment',
        pti > 45 ? 'yüksek' : pti > 35 ? 'orta' : 'düşük',
        'Aylık ödeme riski',
        `Ödeme/gelir oranı ~%${Math.round(pti)}.`,
        'Kapasite altında vade/tutar simüle edin.'
      ),
      buildRiskItem(
        'dti',
        pti > 45 ? 'yüksek' : 'orta',
        'Borç/gelir oranı riski',
        'Mevcut borç + yeni taksit birlikte değerlendirildi.',
        'Borç/gelir tablosunu güncel belgelerle doğrulayın.'
      ),
      buildRiskItem(
        'term',
        months >= 60 ? 'orta' : 'düşük',
        'Vade riski',
        months >= 60 ? 'Uzun vade faiz yükünü artırabilir.' : 'Vade yapısı dengeli.',
        'Kısa/uzun vade senaryolarını tablolaştırın.'
      ),
      buildRiskItem(
        'interest',
        'orta',
        'Toplam faiz yükü',
        'Kampanya dışı oranlar maliyeti artırabilir.',
        'Efektif yıllık maliyet oranını kontrol edin.'
      ),
      buildRiskItem(
        'cashflow',
        context.cashPressure === 'Yüksek' ? 'yüksek' : 'orta',
        'Nakit akışı riski',
        'Serbest nakit tamponu kritik.',
        '3 aylık gider planı ile tampon test edin.'
      ),
      buildRiskItem(
        'flex',
        'orta',
        'Erken kapama esnekliği',
        'Erken kapama cezası sözleşmeyi etkiler.',
        'Erken kapama şartlarını inceleyin.'
      )
    ];
  }

  if (cat === 'tatil') {
    const over =
      context.budgetTarget > 0 && context.totalCost > context.budgetTarget * 1.1;
    return [
      buildRiskItem(
        'budget',
        over ? 'yüksek' : 'düşük',
        'Bütçe aşımı riski',
        over ? 'Toplam maliyet hedef bütçeyi aşabilir.' : 'Bütçe bandı ile uyumlu.',
        'Toplam bütçeye %10–15 rezerv ekleyin.'
      ),
      buildRiskItem(
        'season',
        context.dateFlexibility === 'undecided' ? 'yüksek' : 'orta',
        'Tarih/sezon riski',
        'Sezon yoğunluğu fiyatı etkiler.',
        'Alternatif tarih pencereleri karşılaştırın.'
      ),
      buildRiskItem(
        'family',
        context.childFamily ? 'orta' : 'düşük',
        'Çocuklu aile uygunluğu',
        context.childFamily ? 'Çocuk profili konaklama seçimini etkiler.' : 'Genel profil.',
        'Aktivite ve oda uygunluğunu doğrulayın.'
      ),
      buildRiskItem(
        'transport',
        context.transport === 'ucak' ? 'orta' : 'düşük',
        'Ulaşım riski',
        'Ulaşım tipi maliyet oynaklığı yaratır.',
        'Ulaşım alternatiflerini maliyetlendirin.'
      ),
      buildRiskItem(
        'lodging',
        'orta',
        'Konaklama kalitesi',
        'Konfor beklentisi ile bütçe dengelenmeli.',
        'Konaklama yorumlarını karşılaştırın.'
      ),
      buildRiskItem(
        'cancel',
        context.dateFlexibility === 'undecided' ? 'yüksek' : 'düşük',
        'İptal/esneklik riski',
        'İptal koşulları toplam riski belirler.',
        'İade sürelerini sözleşmede kontrol edin.'
      )
    ];
  }

  // auto
  const pressure =
    context.budget > 0 ? safeNumber(context.totalCost) / context.budget : 1;
  return [
    buildRiskItem(
      'tco',
      pressure > 1.08 ? 'yüksek' : pressure > 0.95 ? 'orta' : 'düşük',
      'Toplam sahip olma maliyeti',
      '12 ay TCO bütçe ile kıyaslandı.',
      'Sigorta, bakım ve yakıt kalemlerini güncelleyin.'
    ),
    buildRiskItem(
      'fuel',
      context.fuel === 'electric' && context.km > 25000 ? 'orta' : 'düşük',
      'Yakıt/enerji tipi',
      'Kullanım ve yakıt tipi uyumu değerlendirildi.',
      'Yıllık km ile enerji maliyetini doğrulayın.'
    ),
    buildRiskItem(
      'maintenance',
      'orta',
      'Bakım riski',
      'Yaş ve segment bakım maliyetini etkiler.',
      'Periyodik bakım planı isteyin.'
    ),
    buildRiskItem(
      'resale',
      'orta',
      'İkinci el değeri',
      'Segment talebi fiyatı etkiler.',
      'İkinci el piyasa emsallerine bakın.'
    ),
    buildRiskItem(
      'credit',
      String(context.loan || '').includes('evet') || context.loan === 'yes' ? 'orta' : 'düşük',
      'Kredi/peşinat dengesi',
      'Finansman yapısı toplam maliyeti değiştirir.',
      'Faiz ve vade senaryolarını karşılaştırın.'
    ),
    buildRiskItem(
      'usage',
      'düşük',
      'Kullanım amacı',
      context.usage ?
        `${context.usage} profiline göre segment seçildi.`
      : 'Kullanım amacı netleştirilmeli.',
      'Şehir içi/uzun yol/aile kullanımına göre model daraltın.'
    )
  ];
}

/**
 * Konut senaryo kartları için açıklama metni (monthlyEffect / riskEffect / totalEffect fallback).
 * @param {object} scenario
 */
export function formatKonutAlternativeDescription(scenario = {}) {
  if (scenario.description) return String(scenario.description).trim();
  if (scenario.summary) return String(scenario.summary).trim();
  const parts = [scenario.monthlyEffect, scenario.riskEffect, scenario.totalEffect].filter(Boolean);
  return parts.length ? parts.join(' · ') : '';
}

/**
 * @param {'auto'|'konut'|'tatil'|'finansman'} category
 * @param {object} context
 */
export function buildAlternativesV3(category, context = {}) {
  const cat = normalizeCategory(category || context.category);
  const fromExtras = context.extras?.scenarios || context.extras?.results;

  if (cat === 'konut' && Array.isArray(fromExtras) && fromExtras.length) {
    return fromExtras.slice(0, 3).map((s) => {
      const description = formatKonutAlternativeDescription(s);
      return {
        title: s.title || s.name || 'Alternatif',
        description: description || 'Alternatif senaryo — profilinize göre değerlendirin.',
        meta: s.meta || (s.score != null ? `${s.score}/100` : '')
      };
    });
  }

  if (cat === 'finansman') {
    return [
      {
        title: 'Daha kısa vade alternatifi',
        description: 'Toplam faizi düşürmek için vade kısaltma',
        meta: 'Nakit akışı baskısı yüksekse'
      },
      {
        title: 'Daha düşük aylık ödeme alternatifi',
        description: 'Vade uzatma veya tutar azaltma',
        meta: 'Aylık yükü rahatlatır'
      },
      {
        title: 'Daha düşük toplam maliyet alternatifi',
        description: 'Anapara %10–15 düşürme senaryosu',
        meta: 'Toplam geri ödemeyi azaltır'
      }
    ];
  }

  if (cat === 'tatil') {
    return [
      {
        title: 'Daha ekonomik tatil alternatifi',
        description: 'Konaklama ve aktivite sadeleştirme',
        meta: 'Bütçe baskısı varsa'
      },
      {
        title: 'Daha konforlu tatil alternatifi',
        description: 'Premium konaklama + transfer',
        meta: 'Konfor öncelikliyse'
      },
      {
        title: 'Daha düşük riskli tarih/rota alternatifi',
        description: 'Sezon dışı veya esnek tarih kaydırma',
        meta: 'İptal/sezon riskini azaltır'
      }
    ];
  }

  return [
    {
      title: 'Daha ekonomik segment alternatifi',
      description: 'Bir alt segment veya daha düşük TCO modelleri',
      meta: 'Bütçe baskısı yüksekse'
    },
    {
      title: 'Hybrid/verimli motor alternatifi',
      description: 'Yakıt maliyetini düşüren motor seçenekleri',
      meta: 'Yüksek km profilinde'
    },
    {
      title: 'Az km / daha genç model alternatifi',
      description: 'Bakım ve değer kaybı riskini azaltır',
      meta: 'Uzun vadeli sahiplik için'
    }
  ];
}

/**
 * @param {'auto'|'konut'|'tatil'|'finansman'} category
 * @param {object} context
 */
export function buildExecutiveSummaryFallbackV3(category, context = {}) {
  const cat = normalizeCategory(category || context.category);
  const score = clampScore(context.decisionScore ?? computeDecisionScoreV3(cat, context));
  const confidence = clampScore(
    context.confidenceScore ?? computeConfidenceScoreV3(cat, context)
  );
  const input = buildInsightInputFromIntelligence(
    cat,
    context,
    {
      decisionScore: score,
      confidenceScore: confidence,
      scoreFactors: context.scoreFactors,
      riskAnalysis: context.riskAnalysis,
      recommendationLevel: context.recommendationLevel,
      recommendationLabel: context.recommendationLabel || RECOMMENDATION_LABELS[context.recommendationLevel],
      overallRisk: context.overallRisk || overallRiskLabel(context.riskAnalysis),
      warnings: context.warnings
    },
    { planTier: context.planTier || 'guest' }
  );
  return buildExecutiveSummary(input);
}

function categoryLabel(cat) {
  return { auto: 'Araç', konut: 'Konut', tatil: 'Tatil', finansman: 'Finansman' }[cat] || 'Karar';
}

/**
 * @param {'auto'|'konut'|'tatil'|'finansman'} category
 * @param {object} context
 */
export function buildNextStepsV3(category, context = {}) {
  const cat = normalizeCategory(category || context.category);
  const level = context.recommendationLevel;

  if (cat === 'konut') {
    const steps = [
      'Bölge emsallerini ve m² fiyat bandını karşılaştırın.',
      'Kredi ön onayı ve faiz senaryolarını tablolaştırın.',
      'Aidat, sigorta ve tapu masraflarını toplam yük hesabına ekleyin.',
      'Satış/likidite senaryosu için 3 benzer ilan inceleyin.'
    ];
    if (level === 'avoid' || level === 'wait') {
      steps.unshift('Bütçe veya peşinat revizyonu yapmadan ilerlemeyin.');
    }
    return steps.slice(0, 6);
  }

  if (cat === 'finansman') {
    return [
      'En az 2–3 banka teklifini EYM ile karşılaştırın.',
      'Aylık ödeme/gelir oranını %40–45 altında tutmayı hedefleyin.',
      'Erken kapama ve sigorta kalemlerini sözleşmede doğrulayın.',
      'Alternatif vade senaryosu tablosu çıkarın.',
      'Dosya/masraf dökümünü satır satır kontrol edin.',
      'Nakit akışı tamponunu 3 ay test edin.'
    ].slice(0, 6);
  }

  if (cat === 'tatil') {
    return [
      'Tarih ve sezon yoğunluğunu kontrol edin.',
      'Konaklama yorumlarını karşılaştırın.',
      'İptal koşullarını inceleyin.',
      'Ulaşım alternatiflerini hesaplayın.',
      'Çocuklu aile için uygunluk kontrolü yapın.',
      'Toplam bütçeye %10–15 rezerv ekleyin.'
    ].slice(0, 6);
  }

  return [
    'En güçlü 2–3 modeli TCO ile yan yana karşılaştırın.',
    'Ekspertiz ve garanti kapsamını doğrulayın.',
    'Sigorta ve bakım tekliflerini güncelleyin.',
    'Kredi kullanacaksanız vade senaryolarını test edin.',
    'İkinci el değer emsallerine bakın.'
  ].slice(0, 6);
}

/**
 * @param {'auto'|'konut'|'tatil'|'finansman'} category
 * @param {object} formData
 * @param {object} metrics
 * @param {object} [extras]
 */
export function buildDecisionIntelligenceResult(category, formData = {}, metrics = {}, extras = {}) {
  const cat = normalizeCategory(category);
  const context = buildDecisionContext(cat, formData, metrics, extras);

  const riskAnalysis = buildRiskAnalysisV3(cat, context);
  context.riskAnalysis = riskAnalysis;

  const decisionScore = computeDecisionScoreV3(cat, context);
  context.decisionScore = decisionScore;

  const confidenceScore = computeConfidenceScoreV3(cat, context);
  context.confidenceScore = confidenceScore;

  const alternatives = buildAlternativesV3(cat, context);
  const recommendationLevel = resolveRecommendationLevel(decisionScore, { ...context, riskAnalysis });
  context.recommendationLevel = recommendationLevel;

  const nextSteps = buildNextStepsV3(cat, context);
  const executiveSummary = buildExecutiveSummaryFallbackV3(cat, context);

  return {
    decisionScore,
    confidenceScore,
    scoreFactors: context.scoreFactors || [],
    riskAnalysis,
    alternatives,
    executiveSummary,
    nextSteps,
    warnings: context.warnings || [],
    recommendationLevel,
    recommendationLabel: RECOMMENDATION_LABELS[recommendationLevel],
    overallRisk: overallRiskLabel(riskAnalysis),
    scoreLabel: resolveScoreLabel(decisionScore, cat),
    context
  };
}

/**
 * AI executive summary with V3 context; safe fallback.
 */
export async function fetchExecutiveSummaryV3(category, context = {}, intelligence = {}, options = {}) {
  const cat = normalizeCategory(category);
  const input = buildInsightInputFromIntelligence(cat, context, intelligence, {
    planTier: options.planTier || context.planTier || 'guest',
    locale: options.locale || 'tr-TR',
    strengths: options.strengths,
    weaknesses: options.weaknesses,
    marketAssessment: options.marketAssessment || context.marketAssessment || '',
    costs: options.costs
  });

  const result = await fetchInsightWithProxy(input, {
    executiveOnly: true,
    skipProxy: options.skipProxy,
    timeoutMs: options.timeoutMs
  });

  return {
    text: sanitizeInsightText(result.text, 950),
    source: result.source === 'ai' ? 'ai' : 'fallback',
    insight: result.insight
  };
}

/**
 * Explainability block HTML for V2 panels.
 * @param {Array<{label,impact,reason}>} scoreFactors
 * @param {string} classPrefix
 */
/**
 * @param {Array<{title?: string, level?: string, description?: string, recommendation?: string}>} riskAnalysis
 * @param {string} classPrefix
 */
export function renderRiskAnalysisHtml(riskAnalysis, classPrefix = 'konut-v2') {
  const risks = Array.isArray(riskAnalysis) ? riskAnalysis : [];
  if (!risks.length) return '';

  const esc = escapeHtml;
  return `
    <section class="${esc(classPrefix)}-risks" aria-label="Risk analizi">
      <h3>Risk Özeti</h3>
      <div class="${esc(classPrefix)}-risk-grid">
        ${risks
          .map(
            (r) => `
          <article class="${esc(classPrefix)}-risk-card">
            <div class="${esc(classPrefix)}-risk-card-head">
              <h4>${esc(r.title || r.key || 'Risk')}</h4>
              <span class="${esc(classPrefix)}-risk ${esc(classPrefix)}-risk--${esc(riskLevelToTone(r.level))}">${esc(r.level || '—')}</span>
            </div>
            <p>${esc(r.description || '')}</p>
            ${
              r.recommendation
                ? `<p class="${esc(classPrefix)}-risk-rec"><strong>Öneri:</strong> ${esc(r.recommendation)}</p>`
                : ''
            }
          </article>`
          )
          .join('')}
      </div>
    </section>`;
}

export function renderScoreFactorsHtml(scoreFactors, classPrefix = 'konut-v2') {
  const factors = Array.isArray(scoreFactors) ? scoreFactors : [];
  if (!factors.length) return '';

  const esc = escapeHtml;
  return `
    <section class="${esc(classPrefix)}-factors" aria-label="Skor faktörleri">
      <h3>Skor faktörleri (açıklanabilir analiz)</h3>
      <ul class="${esc(classPrefix)}-factor-list">
        ${factors
          .map(
            (f) => `
          <li>
            <span class="${esc(classPrefix)}-factor-impact">${esc(f.impact || '0')}</span>
            <strong>${esc(f.label || '')}</strong>
            <span>${esc(f.reason || '')}</span>
          </li>`
          )
          .join('')}
      </ul>
    </section>`;
}
