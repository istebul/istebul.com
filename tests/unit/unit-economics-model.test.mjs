import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUnitEconomicsModel,
  computeGrossMarginPct,
  computeLtvTry,
  computeBlendedCacTry,
  computePaybackMonths,
  computePartnerMarginPct,
  computeConversionEconomics
} from '../../js/features/investor/unit-economics-model.js';

describe('unit-economics-model', () => {
  it('computeGrossMarginPct returns positive margin for Pro ARPU', () => {
    const pct = computeGrossMarginPct({
      arpuTry: 299,
      stripeFeePct: 3.2,
      stripeFixedFeeTry: 2.5,
      variableCostPerUserTry: 25
    });
    assert.ok(pct > 50 && pct < 95);
  });

  it('computeLtvTry scales with lifetime months', () => {
    const ltv = computeLtvTry({ arpuTry: 299, grossMarginPct: 70, lifetimeMonths: 14 });
    assert.ok(ltv > 2000);
  });

  it('computeBlendedCacTry divides spend by paid users', () => {
    assert.equal(computeBlendedCacTry({ marketingSpendTry: 12000, newPaidUsers: 10 }), 1200);
  });

  it('computePaybackMonths returns months', () => {
    const months = computePaybackMonths({ cacTry: 1200, arpuTry: 299, grossMarginPct: 70 });
    assert.ok(months > 4 && months < 12);
  });

  it('computePartnerMarginPct on realized pipeline', () => {
    const p = computePartnerMarginPct({
      pipelineActualTry: 10000,
      pipelineEstimatedTry: 15000,
      leadCount: 20,
      winCount: 4
    });
    assert.ok(p.grossMarginPct != null);
    assert.equal(p.avgRevenuePerWonLeadTry, 2500);
  });

  it('buildUnitEconomicsModel produces core investor metrics', () => {
    const model = buildUnitEconomicsModel({
      executive: {
        windowDays: 30,
        revenue: { arpuTry: 299, mrrTry: 598, arrTry: 7176, attributedRevenueTry: 0 },
        churn: { cancelAtPeriodEnd: 1, activeSubscriptions: 2, trialingSubscriptions: 0 },
        conversions: {
          leadConversionPct: 6,
          checkoutConversionPct: 40,
          paidConversionPct: 25,
          counts: { leads: 50, checkoutStart: 10, checkoutComplete: 4, paid: 2, landing: 800 }
        },
        pipeline: { estimatedTry: 50000, actualTry: 12000 },
        partnerLeadQuality: { totalLeads: 50 },
        traffic: { uniqueSessions: 400, pageViews: 1200 }
      },
      paidSpend: { platforms: { meta: 8000, google_search: 4000 } },
      supportTicketsInWindow: 3
    });

    assert.equal(model.arpu.try, 299);
    assert.equal(model.cac.try, 6000);
    assert.ok(model.ltv.try > 0);
    assert.ok(model.payback.months > 0);
    assert.ok(model.grossMargin.pct > 0);
    assert.ok(model.aiCost.aiCostPerProUserTry > 0);
    assert.ok(model.supportCost.supportCostPerUserTry > 0);
    assert.equal(model.conversionEconomics.costPerPaidTry, 6000);
    assert.ok(model.ratios.ltvCac > 0);
  });

  it('computeConversionEconomics cost per lead', () => {
    const c = computeConversionEconomics({
      conversions: { counts: { leads: 10, paid: 2 } },
      marketingSpendTry: 5000
    });
    assert.equal(c.costPerLeadTry, 500);
    assert.equal(c.costPerPaidTry, 2500);
  });
});
