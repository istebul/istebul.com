/**
 * P17 — Investor unit economics model (CAC, LTV, ARPU, payback, margins, conversion economics).
 * Deterministic; blends live admin metrics with planning assumptions.
 */
import { estimateGroqCallUsd } from '../../core/unit-economics.js';
import { PRO_PLAN_MRR_TRY } from '../metrics/investor-kpis.js';

export const DEFAULT_ASSUMPTIONS = Object.freeze({
  fx: { usdTry: 34 },
  pricing: {
    proArpuMonthlyTry: 299,
    proArpuAnnualMonthlyEquivTry: 239,
    stripeFeePct: 3.2,
    stripeFixedFeeTry: 2.5
  },
  targets: {
    grossMarginPct: 72,
    partnerGrossMarginPct: 70,
    cacProTry: 1200,
    ltvMonths: 14,
    paybackMonthsMax: 6,
    ltvCacRatioMin: 3
  },
  variableCosts: {
    aiCallsPerProUserMonth: 4,
    aiCallsPerFreeMauMonth: 0.35,
    lifecycleEmailsPerMauMonth: 0.15,
    supportTicketsPerThousandMau: 12,
    supportCostPerTicketTry: 85,
    infraUsdPerThousandMau: 2.5
  },
  partnerEconomics: {
    partnerTakeRatePct: 30,
    dispatchCostPerLeadTry: 45,
    avgCommissionPerWonLeadTry: 960
  }
});

function round(n, d = 0) {
  if (n == null || Number.isNaN(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function safeDiv(a, b) {
  if (!b) return null;
  return a / b;
}

/**
 * @param {object} assumptions
 */
export function mergeAssumptions(assumptions = {}) {
  const base = DEFAULT_ASSUMPTIONS;
  return {
    fx: { ...base.fx, ...assumptions.fx },
    pricing: { ...base.pricing, ...assumptions.pricing },
    targets: { ...base.targets, ...assumptions.targets },
    variableCosts: { ...base.variableCosts, ...assumptions.variableCosts },
    partnerEconomics: { ...base.partnerEconomics, ...assumptions.partnerEconomics }
  };
}

/**
 * Monthly churn proxy from cancel-at-period-end signal.
 */
export function computeMonthlyChurnPct({ cancelAtPeriodEnd = 0, activeBillable = 0 } = {}) {
  if (!activeBillable) return null;
  const raw = cancelAtPeriodEnd / activeBillable;
  return round(Math.min(0.25, Math.max(0.005, raw)), 4);
}

/**
 * Gross margin % on Pro ARPU after Stripe + variable cost per user.
 */
export function computeGrossMarginPct({
  arpuTry,
  stripeFeePct = 3.2,
  stripeFixedFeeTry = 2.5,
  variableCostPerUserTry = 0
} = {}) {
  if (!arpuTry) return null;
  const stripeCost = arpuTry * (stripeFeePct / 100) + stripeFixedFeeTry;
  const contribution = arpuTry - stripeCost - variableCostPerUserTry;
  return round((contribution / arpuTry) * 100, 1);
}

/**
 * Customer lifetime months from churn (cap 60).
 */
export function computeLifetimeMonths(monthlyChurnPct, fallbackMonths = 14) {
  if (monthlyChurnPct == null || monthlyChurnPct <= 0) return fallbackMonths;
  return round(Math.min(60, 1 / monthlyChurnPct), 1);
}

/**
 * LTV (TRY) = ARPU × gross_margin × lifetime_months
 */
export function computeLtvTry({
  arpuTry,
  grossMarginPct,
  lifetimeMonths
} = {}) {
  if (!arpuTry || grossMarginPct == null || !lifetimeMonths) return null;
  return round(arpuTry * (grossMarginPct / 100) * lifetimeMonths);
}

/**
 * Blended CAC (TRY) from marketing spend / new paid conversions in window.
 */
export function computeBlendedCacTry({
  marketingSpendTry = 0,
  newPaidUsers = 0,
  newProSubscriptions = 0
} = {}) {
  const denom = newPaidUsers || newProSubscriptions;
  if (!marketingSpendTry || !denom) return null;
  return round(marketingSpendTry / denom);
}

export function computePaybackMonths({ cacTry, arpuTry, grossMarginPct } = {}) {
  if (!cacTry || !arpuTry || grossMarginPct == null) return null;
  const monthlyContribution = arpuTry * (grossMarginPct / 100);
  if (!monthlyContribution) return null;
  return round(cacTry / monthlyContribution, 1);
}

/**
 * Partner marketplace margin on realized pipeline.
 */
export function computePartnerMarginPct({
  pipelineActualTry = 0,
  pipelineEstimatedTry = 0,
  partnerTakeRatePct = 30,
  dispatchCostPerLeadTry = 45,
  leadCount = 0,
  winCount = 0
} = {}) {
  if (!pipelineActualTry) return null;
  const dispatchCost = leadCount * dispatchCostPerLeadTry;
  const partnerShare = pipelineActualTry * (partnerTakeRatePct / 100);
  const net = pipelineActualTry - partnerShare - dispatchCost;
  const grossPct = round((net / pipelineActualTry) * 100, 1);

  const realizationPct =
    pipelineEstimatedTry > 0
      ? round((pipelineActualTry / pipelineEstimatedTry) * 100, 1)
      : null;

  return {
    grossMarginPct: grossPct,
    realizationPct,
    netContributionTry: round(net),
    avgRevenuePerWonLeadTry: winCount ? round(pipelineActualTry / winCount) : null
  };
}

/**
 * AI variable cost per Pro billable user (TRY/month).
 */
export function computeAiCostPerUserTry({
  assumptions,
  proBillable = 0,
  mauEstimate = 0
} = {}) {
  const a = mergeAssumptions(assumptions);
  const usdTry = a.fx.usdTry;
  const perCallUsd = estimateGroqCallUsd({ promptChars: 1200 });
  const proCalls = a.variableCosts.aiCallsPerProUserMonth;
  const aiUsdPerPro = proCalls * perCallUsd;
  const aiTryPerPro = round(aiUsdPerPro * usdTry, 2);

  const blendedMau = Math.max(mauEstimate, proBillable, 1);
  const freeMau = Math.max(0, blendedMau - proBillable);
  const infraUsd =
    (proBillable * aiUsdPerPro + freeMau * a.variableCosts.aiCallsPerFreeMauMonth * perCallUsd) /
    blendedMau;

  return {
    aiCostPerProUserTry: aiTryPerPro,
    aiCostPerMauTry: round(infraUsd * usdTry, 2),
    aiCallsPerProUserMonth: proCalls,
    estimatedUsdPerCall: perCallUsd
  };
}

/**
 * Support cost per MAU (TRY/month) from ticket model.
 */
export function computeSupportCostPerUserTry({
  assumptions,
  mauEstimate = 1000,
  supportTicketsInWindow = 0,
  windowDays = 30
} = {}) {
  const a = mergeAssumptions(assumptions);
  const ticketsPerMauMonth =
    (a.variableCosts.supportTicketsPerThousandMau / 1000) *
    (30 / Math.max(windowDays, 1));
  const modeled =
    ticketsPerMauMonth * a.variableCosts.supportCostPerTicketTry;
  const observed =
    supportTicketsInWindow && mauEstimate
      ? (supportTicketsInWindow / mauEstimate) *
        a.variableCosts.supportCostPerTicketTry *
        (30 / Math.max(windowDays, 1))
      : null;

  return {
    supportCostPerUserTry: round(observed ?? modeled, 2),
    supportCostPerTicketTry: a.variableCosts.supportCostPerTicketTry,
    ticketsPerMauMonth: round(ticketsPerMauMonth, 2),
    source: observed != null ? 'observed' : 'modeled'
  };
}

/**
 * Funnel unit economics (cost per step).
 */
export function computeConversionEconomics({
  conversions = {},
  marketingSpendTry = 0,
  attributedRevenueTry = 0
} = {}) {
  const c = conversions.counts || {};
  const spend = marketingSpendTry || 0;

  return {
    costPerLeadTry: spend && c.leads ? round(spend / c.leads) : null,
    costPerCheckoutStartTry: spend && c.checkoutStart ? round(spend / c.checkoutStart) : null,
    costPerPaidTry: spend && c.paid ? round(spend / c.paid) : null,
    revenuePerPaidTry: c.paid && attributedRevenueTry ? round(attributedRevenueTry / c.paid) : null,
    landingToLeadPct: conversions.leadConversionPct ?? null,
    checkoutConversionPct: conversions.checkoutConversionPct ?? null,
    paidConversionPct: conversions.paidConversionPct ?? null,
    wizardCompletionPct: conversions.wizardCompletionPct ?? null,
    counts: { ...c }
  };
}

function sumPaidSpendTry(spendConfig) {
  if (!spendConfig?.platforms) return 0;
  return Object.values(spendConfig.platforms).reduce(
    (s, v) => s + Number(v || 0),
    0
  );
}

/**
 * @param {{
 *   windowDays?: number,
 *   assumptions?: object,
 *   executive?: object,
 *   investor?: object,
 *   paidSpend?: object | null,
 *   supportTicketsInWindow?: number
 * }} input
 */
export function buildUnitEconomicsModel(input = {}) {
  const assumptions = mergeAssumptions(input.assumptions);
  const ex = input.executive || {};
  const inv = input.investor || {};
  const windowDays = input.windowDays ?? ex.windowDays ?? 30;

  const arpuTry =
    ex.revenue?.arpuTry ??
    (inv.subscription?.totalBillable
      ? round(inv.subscription.mrrTry / inv.subscription.totalBillable)
      : assumptions.pricing.proArpuMonthlyTry);

  const activeBillable =
    (ex.churn?.activeSubscriptions ?? 0) + (ex.churn?.trialingSubscriptions ?? 0) ||
    inv.subscription?.totalBillable ||
    0;

  const hasLiveSubs = activeBillable > 0;
  const monthlyChurnPct = hasLiveSubs
    ? computeMonthlyChurnPct({
        cancelAtPeriodEnd:
          ex.churn?.cancelAtPeriodEnd ?? inv.subscription?.cancelAtPeriodEnd ?? 0,
        activeBillable
      })
    : round(1 / assumptions.targets.ltvMonths, 4);

  const mauEstimate = Math.max(
    ex.traffic?.uniqueSessions || 0,
    ex.traffic?.pageViews ? Math.round(ex.traffic.pageViews / 3) : 0,
    activeBillable * 8,
    500
  );

  const ai = computeAiCostPerUserTry({
    assumptions,
    proBillable: activeBillable,
    mauEstimate
  });

  const support = computeSupportCostPerUserTry({
    assumptions,
    mauEstimate,
    supportTicketsInWindow: input.supportTicketsInWindow ?? 0,
    windowDays
  });

  const variableCostPerUserTry = round((ai.aiCostPerProUserTry || 0) + (support.supportCostPerUserTry || 0));

  const grossMarginPct = computeGrossMarginPct({
    arpuTry,
    stripeFeePct: assumptions.pricing.stripeFeePct,
    stripeFixedFeeTry: assumptions.pricing.stripeFixedFeeTry,
    variableCostPerUserTry
  });

  const lifetimeMonths = computeLifetimeMonths(
    monthlyChurnPct,
    assumptions.targets.ltvMonths
  );

  const ltvTry = computeLtvTry({ arpuTry, grossMarginPct, lifetimeMonths });

  const marketingSpendTry = sumPaidSpendTry(input.paidSpend);
  const newPaidUsers = ex.conversions?.counts?.paid ?? inv.funnel?.paidConversion ?? 0;

  const cacTry =
    computeBlendedCacTry({
      marketingSpendTry,
      newPaidUsers,
      newProSubscriptions: ex.conversions?.counts?.checkoutComplete ?? 0
    }) ?? (marketingSpendTry ? null : assumptions.targets.cacProTry);

  const paybackMonths = computePaybackMonths({ cacTry, arpuTry, grossMarginPct });

  const ltvCacRatio =
    ltvTry && cacTry ? round(ltvTry / cacTry, 2) : null;

  const partner = computePartnerMarginPct({
    pipelineActualTry: ex.pipeline?.actualTry ?? inv.pipeline?.pipelineActualTry ?? 0,
    pipelineEstimatedTry: ex.pipeline?.estimatedTry ?? inv.pipeline?.pipelineEstimatedTry ?? 0,
    partnerTakeRatePct: assumptions.partnerEconomics.partnerTakeRatePct,
    dispatchCostPerLeadTry: assumptions.partnerEconomics.dispatchCostPerLeadTry,
    leadCount: ex.partnerLeadQuality?.totalLeads ?? inv.pipeline?.leadCount ?? 0,
    winCount: inv.pipeline?.partnerWinCount ?? 0
  });

  const conversionEconomics = computeConversionEconomics({
    conversions: ex.conversions || {},
    marketingSpendTry,
    attributedRevenueTry: ex.revenue?.attributedRevenueTry ?? 0
  });

  const health = [];
  if (ltvCacRatio != null && ltvCacRatio < assumptions.targets.ltvCacRatioMin) {
    health.push(`LTV/CAC ${ltvCacRatio} below target ${assumptions.targets.ltvCacRatioMin}`);
  }
  if (paybackMonths != null && paybackMonths > assumptions.targets.paybackMonthsMax) {
    health.push(`Payback ${paybackMonths}mo exceeds target ${assumptions.targets.paybackMonthsMax}mo`);
  }
  if (grossMarginPct != null && grossMarginPct < assumptions.targets.grossMarginPct - 5) {
    health.push(`Gross margin ${grossMarginPct}% below target band`);
  }
  if (!marketingSpendTry) {
    health.push('CAC uses planning target — import data/growth/paid-spend.json for live CAC');
  }

  return {
    version: 'p17.0',
    generatedAt: new Date().toISOString(),
    windowDays,
    currency: 'TRY',
    arpu: {
      try: arpuTry,
      source: ex.revenue?.arpuTry ? 'live' : 'assumption',
      planMonthlyTry: PRO_PLAN_MRR_TRY.monthly,
      planAnnualEquivTry: PRO_PLAN_MRR_TRY.annualMonthlyEquivalent
    },
    cac: {
      try: cacTry,
      marketingSpendTry: round(marketingSpendTry),
      newPaidUsers,
      source: marketingSpendTry && newPaidUsers ? 'live' : 'target',
      targetTry: assumptions.targets.cacProTry
    },
    ltv: {
      try: ltvTry,
      lifetimeMonths,
      monthlyChurnPct,
      grossMarginPctUsed: grossMarginPct
    },
    payback: {
      months: paybackMonths,
      targetMonthsMax: assumptions.targets.paybackMonthsMax,
      healthy: paybackMonths != null ? paybackMonths <= assumptions.targets.paybackMonthsMax : null
    },
    grossMargin: {
      pct: grossMarginPct,
      targetPct: assumptions.targets.grossMarginPct,
      variableCostPerUserTry,
      stripeFeePct: assumptions.pricing.stripeFeePct
    },
    partnerMargin: partner,
    aiCost: ai,
    supportCost: support,
    conversionEconomics,
    ratios: {
      ltvCac: ltvCacRatio,
      ltvCacTargetMin: assumptions.targets.ltvCacRatioMin
    },
    blendedRevenue: {
      mrrTry: ex.revenue?.mrrTry ?? inv.subscription?.mrrTry ?? 0,
      arrTry: ex.revenue?.arrTry ?? inv.subscription?.arrTry ?? 0,
      pipelineActualTry: ex.pipeline?.actualTry ?? inv.pipeline?.pipelineActualTry ?? 0
    },
    health,
    assumptionsUsed: assumptions
  };
}
