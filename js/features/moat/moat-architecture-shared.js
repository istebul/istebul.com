/**
 * P3.6 Long-term moat architecture — layer registry, copy resistance, defensibility index.
 * Browser + unit tests; server mirror: supabase/functions/_shared/moat-architecture.ts
 */

export const MOAT_ARCHITECTURE_VERSION = 'p3.6';

/** @typedef {'nascent'|'building'|'active'|'compounding'} MoatMaturity */

export const MOAT_LAYERS = Object.freeze([
  {
    id: 'proprietary_decision_logic',
    name: 'Proprietary decision logic',
    productLabel: 'Deterministik karar motoru',
    description:
      'Şeffaf skor, güven bandı ayrımı ve TCO — LLM skoru override edemez. Rakip UI kopyalar, motoru değil.',
    dataSources: ['decision-consultant.js', 'auto-intake', 'decision_session_id'],
    copyResistance: 'high',
    copyMonthsMin: 9,
    copyMonthsMax: 18,
    competitorPath: 'Sadece chat UI + prompt — skor/TCO/dispatch olmadan yüzeysel kalır.',
    weight: 0.16
  },
  {
    id: 'anonymized_outcome_feedback',
    name: 'Anonymized outcome feedback',
    productLabel: 'Anonim outcome graph',
    description:
      'KVKK-safe outcome_signal_events + product_feedback — segment kalibrasyonu kural tabanlı, ML iddiası yok.',
    dataSources: ['outcome_signal_events', 'product_feedback', 'outcome-capture'],
    copyResistance: 'high',
    copyMonthsMin: 12,
    copyMonthsMax: 24,
    competitorPath: 'Form feedback toplanır; partner+CRM kapalı döngü ve idempotency olmadan veri kirliliği.',
    weight: 0.14
  },
  {
    id: 'partner_conversion_data',
    name: 'Partner conversion data',
    productLabel: 'Partner dönüşüm verisi',
    description:
      'Skorlu lead, dispatch log, partner_status callback — win rate segment bazında kalibre eder.',
    dataSources: ['auto_leads', 'partner_lead_dispatch_logs', 'partner-callback'],
    copyResistance: 'high',
    copyMonthsMin: 12,
    copyMonthsMax: 18,
    competitorPath: 'Lead formu kolay; imzalı webhook + retry + min_lead_score operasyonu zor.',
    weight: 0.14
  },
  {
    id: 'recommendation_intelligence',
    name: 'Recommendation intelligence',
    productLabel: 'Öneri zekâsı',
    description:
      'feedback_submitted, recommendation_success/rejected — ürün öğrenir, kullanıcıya spam hissi vermez.',
    dataSources: ['product_feedback', 'product_feedback_intelligence_summary'],
    copyResistance: 'medium',
    copyMonthsMin: 6,
    copyMonthsMax: 12,
    competitorPath: 'NPS anketi kopyalanır; outcome graph ile bağlantısız kalır.',
    weight: 0.1
  },
  {
    id: 'decision_confidence_evolution',
    name: 'Decision confidence evolution',
    productLabel: 'Güven bandı evrimi',
    description:
      'confidence_accuracy sinyalleri + çok sinyalli güven meta — zamanla girdi kalitesi iyileşir.',
    dataSources: ['decision_feedback', 'confidence_accuracy signals', 'moat_segment_benchmarks'],
    copyResistance: 'medium',
    copyMonthsMin: 8,
    copyMonthsMax: 14,
    competitorPath: 'Tek skor gösterilir; güven≠skor ayrımı ve sinyal şeffaflığı eksik kalır.',
    weight: 0.1
  },
  {
    id: 'lifecycle_intelligence',
    name: 'Lifecycle intelligence',
    productLabel: 'Lifecycle zekâsı',
    description:
      'Enroll → mesaj → recovery; karar hunisi ile bağlı e-posta, abandon ve upsell akışları.',
    dataSources: ['lifecycle_enrollments', 'lifecycle_messages', 'lifecycle-cron'],
    copyResistance: 'medium',
    copyMonthsMin: 4,
    copyMonthsMax: 9,
    competitorPath: 'Generic drip kopyalanır; decision session + outcome tetikleyicileri bağlanmaz.',
    weight: 0.1
  },
  {
    id: 'referral_graph',
    name: 'Referral graph',
    productLabel: 'Referral graph',
    description:
      'Kod → attribution → reward — organik büyüme ve düşük CAC; karar tamamlama ile ilişkilendirilir.',
    dataSources: ['referral_codes', 'referral_attributions', 'referral_rewards'],
    copyResistance: 'medium',
    copyMonthsMin: 3,
    copyMonthsMax: 8,
    competitorPath: 'Basit referans linki; funnel attribution ve Pro dönüşüm bağlantısı zayıf.',
    weight: 0.08
  },
  {
    id: 'b2b_network_effects',
    name: 'B2B network effects',
    productLabel: 'B2B ağ etkileri',
    description:
      'Partner onboarding, API, tier monetization — daha fazla partner → daha iyi SLA → daha iyi outcome.',
    dataSources: ['partner_applications', 'partner_endpoints', 'partner-onboarding'],
    copyResistance: 'high',
    copyMonthsMin: 12,
    copyMonthsMax: 24,
    competitorPath: 'Partner sayfası kolay; skorlu dispatch OS + CRM + outcome geri beslemesi ağır.',
    weight: 0.18
  }
]);

const MATURITY_ORDER = { nascent: 0, building: 1, active: 2, compounding: 3 };

/**
 * Score a single moat layer 0–100 from operational metrics (honest thresholds).
 */
export function scoreMoatLayer(layerId, metrics = {}) {
  const m = metrics;
  switch (layerId) {
    case 'proprietary_decision_logic': {
      const linked =
        m.leadCount > 0 ? (m.decisionLinkedCount || 0) / m.leadCount : 0;
      const sessions = m.decisionSessionCount || m.decisionLinkedCount || 0;
      return clampScore(linked * 45 + Math.min(sessions, 200) * 0.25 + 25);
    }
    case 'anonymized_outcome_feedback': {
      const signals = m.outcomeSignalTotal || 0;
      const pf = m.productFeedbackTotal || 0;
      return clampScore(Math.min(signals, 500) * 0.12 + Math.min(pf, 200) * 0.2 + 15);
    }
    case 'partner_conversion_data': {
      const wins = m.outcomeCount || 0;
      const partners = m.activePartnerEndpoints || 0;
      return clampScore(Math.min(wins, 100) * 0.4 + Math.min(partners, 20) * 3 + 10);
    }
    case 'recommendation_intelligence': {
      const pf = m.productFeedbackTotal || 0;
      const useful = m.productFeedbackUseful || 0;
      return clampScore(Math.min(pf, 150) * 0.35 + (pf > 0 ? (useful / pf) * 30 : 0) + 12);
    }
    case 'decision_confidence_evolution': {
      const cal = m.calibratedLeadCount || 0;
      const confSignals = m.confidenceAccuracySignals || 0;
      const segments = m.segmentCount || 0;
      return clampScore(Math.min(cal, 80) * 0.5 + Math.min(confSignals, 100) * 0.2 + segments * 5 + 10);
    }
    case 'lifecycle_intelligence': {
      const enroll = m.lifecycleEnrollments || 0;
      const sent = m.lifecycleMessagesSent || 0;
      return clampScore(Math.min(enroll, 300) * 0.15 + Math.min(sent, 500) * 0.08 + 12);
    }
    case 'referral_graph': {
      const attr = m.referralAttributions || 0;
      const codes = m.referralCodes || 0;
      return clampScore(Math.min(attr, 200) * 0.2 + Math.min(codes, 100) * 0.15 + 10);
    }
    case 'b2b_network_effects': {
      const endpoints = m.activePartnerEndpoints || 0;
      const apps = m.partnerApplications || 0;
      return clampScore(Math.min(endpoints, 30) * 4 + Math.min(apps, 50) * 1.5 + 8);
    }
    default:
      return 0;
  }
}

function clampScore(n) {
  return Math.round(Math.max(0, Math.min(100, n)));
}

export function maturityFromScore(score) {
  if (score >= 72) return 'compounding';
  if (score >= 48) return 'active';
  if (score >= 24) return 'building';
  return 'nascent';
}

export function computeMoatLayerHealth(metrics = {}) {
  return MOAT_LAYERS.map((layer) => {
    const score = scoreMoatLayer(layer.id, metrics);
    const maturity = maturityFromScore(score);
    return {
      ...layer,
      score,
      maturity,
      copyTimeLabel: `${layer.copyMonthsMin}–${layer.copyMonthsMax} ay operasyon`
    };
  });
}

export function computeDefensibilityIndex(layerHealth = []) {
  const rows = layerHealth.length ? layerHealth : computeMoatLayerHealth();
  let sum = 0;
  let w = 0;
  for (const row of rows) {
    const weight = row.weight || 0.125;
    sum += row.score * weight;
    w += weight;
  }
  return Math.round(w > 0 ? sum / w : 0);
}

export function assessCompetitorCopyBundle(layerHealth = []) {
  const rows = layerHealth.length ? layerHealth : computeMoatLayerHealth();
  const highResistance = rows.filter((r) => r.copyResistance === 'high' && r.score >= 40);
  const weakest = [...rows].sort((a, b) => a.score - b.score).slice(0, 2);

  return {
    headline:
      highResistance.length >= 4
        ? 'Bileşik savunma: tek katman kopyası yeterli değil'
        : 'Moat birikiyor — erken aşamada kopya riski',
    highResistanceCount: highResistance.length,
    weakestLayers: weakest.map((r) => r.id),
    estimatedCopyEffort:
      'UI + generic AI: 3–6 ay · Tam flywheel (partner operasyonu + outcome + CRM): 12–24 ay',
    layers: rows.map((r) => ({
      id: r.id,
      copyResistance: r.copyResistance,
      competitorPath: r.competitorPath,
      copyTimeLabel: r.copyTimeLabel
    }))
  };
}

export function mergeFlywheelMetrics(dashboard = {}, extra = {}) {
  return {
    leadCount: dashboard.leadCount || 0,
    outcomeCount: dashboard.outcomeCount || 0,
    calibratedLeadCount: dashboard.calibratedLeadCount || 0,
    decisionLinkedCount: dashboard.decisionLinkedCount || 0,
    segmentCount: dashboard.segmentCount || 0,
    outcomeSignalTotal: dashboard.outcomeSignalTotal || 0,
    feedbackTotal: dashboard.feedbackTotal || 0,
    ...extra
  };
}

export const MOAT_ANALYTICS_ARCH = Object.freeze({
  MOAT_ARCHITECTURE_VIEW: 'moat_architecture_view',
  MOAT_DEFENSIBILITY_SNAPSHOT: 'moat_defensibility_snapshot'
});
