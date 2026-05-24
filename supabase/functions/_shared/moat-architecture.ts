/**
 * P3.6 Moat architecture — server-side flywheel aggregation + layer scoring.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const MOAT_ARCHITECTURE_VERSION = "p3.6";

type LayerDef = {
  id: string;
  name: string;
  weight: number;
  copyResistance: string;
  copyMonthsMin: number;
  copyMonthsMax: number;
  competitorPath: string;
};

export const MOAT_LAYERS: LayerDef[] = [
  {
    id: "proprietary_decision_logic",
    name: "Proprietary decision logic",
    weight: 0.16,
    copyResistance: "high",
    copyMonthsMin: 9,
    copyMonthsMax: 18,
    competitorPath:
      "UI-only copy fails without deterministic score + TCO + dispatch.",
  },
  {
    id: "anonymized_outcome_feedback",
    name: "Anonymized outcome feedback",
    weight: 0.14,
    copyResistance: "high",
    copyMonthsMin: 12,
    copyMonthsMax: 24,
    competitorPath: "Feedback without partner/CRM loop stays noisy.",
  },
  {
    id: "partner_conversion_data",
    name: "Partner conversion data",
    weight: 0.14,
    copyResistance: "high",
    copyMonthsMin: 12,
    copyMonthsMax: 18,
    competitorPath: "Lead forms easy; signed webhooks + retry + scoring hard.",
  },
  {
    id: "recommendation_intelligence",
    name: "Recommendation intelligence",
    weight: 0.1,
    copyResistance: "medium",
    copyMonthsMin: 6,
    copyMonthsMax: 12,
    competitorPath: "Detached NPS ≠ outcome-linked product intelligence.",
  },
  {
    id: "decision_confidence_evolution",
    name: "Decision confidence evolution",
    weight: 0.1,
    copyResistance: "medium",
    copyMonthsMin: 8,
    copyMonthsMax: 14,
    competitorPath: "Single score UI misses confidence≠match semantics.",
  },
  {
    id: "lifecycle_intelligence",
    name: "Lifecycle intelligence",
    weight: 0.1,
    copyResistance: "medium",
    copyMonthsMin: 4,
    copyMonthsMax: 9,
    competitorPath: "Generic drip without decision triggers.",
  },
  {
    id: "referral_graph",
    name: "Referral graph",
    weight: 0.08,
    copyResistance: "medium",
    copyMonthsMin: 3,
    copyMonthsMax: 8,
    competitorPath: "Referral links without funnel attribution.",
  },
  {
    id: "b2b_network_effects",
    name: "B2B network effects",
    weight: 0.18,
    copyResistance: "high",
    copyMonthsMin: 12,
    copyMonthsMax: 24,
    competitorPath: "Partner landing ≠ partner OS + outcome feedback.",
  },
];

function clampScore(n: number) {
  return Math.round(Math.max(0, Math.min(100, n)));
}

export function scoreMoatLayer(layerId: string, m: Record<string, number>) {
  switch (layerId) {
    case "proprietary_decision_logic": {
      const linked = m.leadCount > 0 ? (m.decisionLinkedCount || 0) / m.leadCount : 0;
      return clampScore(linked * 45 + Math.min(m.decisionLinkedCount || 0, 200) * 0.25 + 25);
    }
    case "anonymized_outcome_feedback":
      return clampScore(
        Math.min(m.outcomeSignalTotal || 0, 500) * 0.12 +
          Math.min(m.productFeedbackTotal || 0, 200) * 0.2 +
          15
      );
    case "partner_conversion_data":
      return clampScore(
        Math.min(m.outcomeCount || 0, 100) * 0.4 +
          Math.min(m.activePartnerEndpoints || 0, 20) * 3 +
          10
      );
    case "recommendation_intelligence": {
      const pf = m.productFeedbackTotal || 0;
      const useful = m.productFeedbackUseful || 0;
      return clampScore(Math.min(pf, 150) * 0.35 + (pf > 0 ? (useful / pf) * 30 : 0) + 12);
    }
    case "decision_confidence_evolution":
      return clampScore(
        Math.min(m.calibratedLeadCount || 0, 80) * 0.5 +
          Math.min(m.confidenceAccuracySignals || 0, 100) * 0.2 +
          (m.segmentCount || 0) * 5 +
          10
      );
    case "lifecycle_intelligence":
      return clampScore(
        Math.min(m.lifecycleEnrollments || 0, 300) * 0.15 +
          Math.min(m.lifecycleMessagesSent || 0, 500) * 0.08 +
          12
      );
    case "referral_graph":
      return clampScore(
        Math.min(m.referralAttributions || 0, 200) * 0.2 +
          Math.min(m.referralCodes || 0, 100) * 0.15 +
          10
      );
    case "b2b_network_effects":
      return clampScore(
        Math.min(m.activePartnerEndpoints || 0, 30) * 4 +
          Math.min(m.partnerApplications || 0, 50) * 1.5 +
          8
      );
    default:
      return 0;
  }
}

function maturityFromScore(score: number) {
  if (score >= 72) return "compounding";
  if (score >= 48) return "active";
  if (score >= 24) return "building";
  return "nascent";
}

export function computeMoatLayerHealth(metrics: Record<string, number>) {
  return MOAT_LAYERS.map((layer) => {
    const score = scoreMoatLayer(layer.id, metrics);
    return {
      ...layer,
      score,
      maturity: maturityFromScore(score),
      copyTimeLabel: `${layer.copyMonthsMin}–${layer.copyMonthsMax} ay`,
    };
  });
}

export function computeDefensibilityIndex(
  layerHealth: Array<{ score: number; weight: number }>
) {
  let sum = 0;
  let w = 0;
  for (const row of layerHealth) {
    sum += row.score * row.weight;
    w += row.weight;
  }
  return Math.round(w > 0 ? sum / w : 0);
}

const WIN = new Set(["paid", "closed", "won", "delivered", "funded", "purchased"]);

async function countSince(
  admin: SupabaseClient,
  table: string,
  since: string,
  extra?: (q: ReturnType<SupabaseClient["from"]>) => ReturnType<SupabaseClient["from"]>
) {
  try {
    let q = admin.from(table).select("id", { count: "exact", head: true });
    if (extra) q = extra(q) as ReturnType<SupabaseClient["from"]>;
    const { count, error } = await q.gte("created_at", since);
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

export async function collectFlywheelMetrics(admin: SupabaseClient) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const metrics: Record<string, number> = {
    leadCount: 0,
    outcomeCount: 0,
    decisionLinkedCount: 0,
    calibratedLeadCount: 0,
    segmentCount: 0,
    outcomeSignalTotal: 0,
    productFeedbackTotal: 0,
    productFeedbackUseful: 0,
    confidenceAccuracySignals: 0,
    lifecycleEnrollments: 0,
    lifecycleMessagesSent: 0,
    referralAttributions: 0,
    referralCodes: 0,
    activePartnerEndpoints: 0,
    partnerApplications: 0,
    feedbackTotal: 0,
  };

  try {
    const { count } = await admin.from("auto_leads").select("id", {
      count: "exact",
      head: true,
    });
    metrics.leadCount = count || 0;
  } catch {
    /* ignore */
  }

  try {
    const { data: leads } = await admin
      .from("auto_leads")
      .select("partner_status, decision_session_id, scoring_calibration_delta, segment_key")
      .order("created_at", { ascending: false })
      .limit(3000);

    const rows = leads || [];
    metrics.outcomeCount = rows.filter((l) =>
      WIN.has(String(l.partner_status || ""))
    ).length;
    metrics.decisionLinkedCount = rows.filter((l) => l.decision_session_id).length;
    metrics.calibratedLeadCount = rows.filter(
      (l) => Number(l.scoring_calibration_delta || 0) !== 0
    ).length;
    metrics.segmentCount = new Set(
      rows.map((l) => l.segment_key).filter(Boolean)
    ).size;
  } catch {
    /* ignore */
  }

  metrics.outcomeSignalTotal = await countSince(admin, "outcome_signal_events", since);
  metrics.productFeedbackTotal = await countSince(admin, "product_feedback", since);
  metrics.feedbackTotal = await countSince(admin, "decision_feedback", since);
  metrics.lifecycleEnrollments = await countSince(admin, "lifecycle_enrollments", since);
  metrics.referralAttributions = await countSince(admin, "referral_attributions", since);

  metrics.productFeedbackUseful = await countSince(
    admin,
    "product_feedback",
    since,
    (q) => q.eq("useful_rating", "yes")
  );

  metrics.confidenceAccuracySignals = await countSince(
    admin,
    "outcome_signal_events",
    since,
    (q) => q.eq("signal_type", "confidence_accuracy")
  );

  metrics.lifecycleMessagesSent = await countSince(
    admin,
    "lifecycle_messages",
    since,
    (q) => q.eq("status", "sent")
  );

  try {
    const { count } = await admin.from("referral_codes").select("id", {
      count: "exact",
      head: true,
    });
    metrics.referralCodes = count || 0;
  } catch {
    /* ignore */
  }

  try {
    const { count } = await admin
      .from("partner_endpoints")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    metrics.activePartnerEndpoints = count || 0;
  } catch {
    /* ignore */
  }

  try {
    const { count } = await admin.from("partner_applications").select("id", {
      count: "exact",
      head: true,
    });
    metrics.partnerApplications = count || 0;
  } catch {
    /* ignore */
  }

  return metrics;
}
